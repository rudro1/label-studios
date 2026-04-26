"""ZIP bulk import — preserves original filenames byte-for-byte.

Endpoints:
    POST /api/projects/<pk>/import/zip/
        multipart: file=<zipfile>
        optional ?cloudinary=1   forces Cloudinary mirroring (CLOUDINARY_URL env)

    POST /api/projects/<pk>/import/cloudinary-zip/
        json: {"url": "https://res.cloudinary.com/.../package.zip",
               "cloudinary": false}

Each import gets its own per-import directory under MEDIA_ROOT/upload/<project>/<batch>/
so original filenames are preserved EXACTLY — no UUID prefix, no `-1` suffix on
duplicate basenames. Two `audio.wav` files coexist because they live in different
batch dirs.

Export round-trip: `data_export/serializers.py` already strips UUID prefix; with
this importer there is no prefix to strip, so basename(file) === original name.
"""
from __future__ import annotations

import json
import logging
import os
import tempfile
import uuid
import zipfile
from typing import Tuple

import requests
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from data_import.models import FileUpload
from projects.models import Project
from tasks.models import Task

logger = logging.getLogger(__name__)

ALLOWED_EXTS = (
    '.wav', '.mp3', '.flac', '.ogg', '.m4a', '.webm',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp',
    '.mp4', '.mov', '.txt', '.json', '.csv', '.pdf',
)
MAX_ZIP_BYTES = 2 * 1024 * 1024 * 1024  # 2 GiB
MAX_FILES = 5000
MAX_DOWNLOAD_BYTES = MAX_ZIP_BYTES


def _safe_relpath(name: str) -> str | None:
    """Reject zip-slip / absolute / parent-traversal entries."""
    if not name or name.endswith('/'):
        return None
    norm = os.path.normpath(name).replace('\\', '/')
    if norm.startswith('/') or norm.startswith('..') or '/../' in norm:
        return None
    return norm


def _data_key_for(ext: str) -> str:
    audio = {'.wav', '.mp3', '.flac', '.ogg', '.m4a', '.webm'}
    image = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
    video = {'.mp4', '.mov'}
    if ext in audio:
        return 'audio'
    if ext in image:
        return 'image'
    if ext in video:
        return 'video'
    return 'file'


def _maybe_cloudinary_upload(local_path: str, public_id: str) -> Tuple[str | None, str | None]:
    """Returns (secure_url, error). Error string when SDK or env missing."""
    if not os.environ.get('CLOUDINARY_URL'):
        return None, 'CLOUDINARY_URL not set'
    try:
        import cloudinary  # type: ignore
        import cloudinary.uploader  # type: ignore
    except Exception as exc:
        return None, f'cloudinary SDK missing: {exc}'
    try:
        resp = cloudinary.uploader.upload(
            local_path,
            public_id=public_id,
            resource_type='auto',
            use_filename=True,
            unique_filename=False,
            overwrite=False,
        )
        return resp.get('secure_url'), None
    except Exception as exc:
        return None, str(exc)


def _stream_download(url: str, dest_path: str, max_bytes: int = MAX_DOWNLOAD_BYTES) -> None:
    """Stream-download URL to dest_path. Raises ValueError on size overflow."""
    written = 0
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(dest_path, 'wb') as fh:
            for chunk in r.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                written += len(chunk)
                if written > max_bytes:
                    raise ValueError(f'download exceeded {max_bytes} bytes')
                fh.write(chunk)


def _extract_zip(
    project: Project,
    user,
    zip_path: str,
    use_cloudinary: bool = False,
) -> dict:
    """Extract zip into a fresh per-batch dir under MEDIA_ROOT/upload/<pid>/<batch>/.
    Original filenames preserved verbatim. Returns summary dict.
    """
    batch_id = f'zip-{uuid.uuid4().hex[:8]}'
    batch_dir = os.path.join(
        settings.MEDIA_ROOT, settings.UPLOAD_DIR, str(project.id), batch_id,
    )
    os.makedirs(batch_dir, exist_ok=True)

    created_tasks = 0
    file_upload_ids: list[int] = []
    skipped: list[dict] = []

    try:
        zf = zipfile.ZipFile(zip_path)
    except zipfile.BadZipFile:
        return {'error': 'invalid zip', 'created_tasks': 0,
                'file_uploads': [], 'skipped': []}

    names = [n for n in zf.namelist() if not n.endswith('/')]
    if len(names) > MAX_FILES:
        zf.close()
        return {'error': f'zip has {len(names)} files; limit {MAX_FILES}',
                'created_tasks': 0, 'file_uploads': [], 'skipped': []}

    with zf:
        for name in names:
            rel = _safe_relpath(name)
            if rel is None:
                skipped.append({'name': name, 'reason': 'unsafe path'})
                continue
            ext = os.path.splitext(rel)[1].lower()
            if ext not in ALLOWED_EXTS:
                skipped.append({'name': rel, 'reason': f'extension {ext} not allowed'})
                continue

            target = os.path.join(batch_dir, rel)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            try:
                with zf.open(name) as src, open(target, 'wb') as dst:
                    for chunk in iter(lambda: src.read(64 * 1024), b''):
                        dst.write(chunk)
            except Exception as exc:
                skipped.append({'name': rel, 'reason': f'extract failed: {exc}'})
                continue

            rel_path = os.path.relpath(target, settings.MEDIA_ROOT).replace(os.sep, '/')
            fu = FileUpload(user=user, project=project)
            fu.file.name = rel_path
            fu.save()
            file_upload_ids.append(fu.id)

            data_url = fu.url
            if use_cloudinary:
                public_id = f'fixensy/p{project.id}/{batch_id}/{os.path.splitext(rel)[0]}'
                cloud_url, cloud_err = _maybe_cloudinary_upload(target, public_id)
                if cloud_url:
                    data_url = cloud_url
                elif cloud_err:
                    logger.warning('cloudinary upload skip for %s: %s', rel, cloud_err)

            Task.objects.create(
                project=project,
                data={
                    _data_key_for(ext): data_url,
                    'filename': os.path.basename(rel),
                    'original_path': rel,
                },
                file_upload=fu,
            )
            created_tasks += 1

    return {
        'batch_id': batch_id,
        'created_tasks': created_tasks,
        'file_uploads': file_upload_ids,
        'skipped': skipped,
    }


class ZipImportAPI(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        if not project.has_permission(request.user):
            return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

        upload = request.FILES.get('file')
        if not upload:
            return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size and upload.size > MAX_ZIP_BYTES:
            return Response({'detail': 'zip exceeds 2 GiB'}, status=status.HTTP_400_BAD_REQUEST)

        use_cloudinary = request.query_params.get('cloudinary') == '1'

        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tf:
            tmp_path = tf.name
            for chunk in upload.chunks():
                tf.write(chunk)

        try:
            result = _extract_zip(project, request.user, tmp_path, use_cloudinary)
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

        if 'error' in result:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_201_CREATED)


class CloudinaryZipImportAPI(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        if not project.has_permission(request.user):
            return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body or '{}')
        except ValueError:
            return Response({'detail': 'invalid json'}, status=status.HTTP_400_BAD_REQUEST)

        url = payload.get('url')
        if not url or not isinstance(url, str) or not url.startswith(('http://', 'https://')):
            return Response({'detail': 'url (http/https) required'}, status=status.HTTP_400_BAD_REQUEST)
        use_cloudinary = bool(payload.get('cloudinary', False))

        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tf:
            tmp_path = tf.name
        try:
            try:
                _stream_download(url, tmp_path)
            except ValueError as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            except requests.RequestException as exc:
                return Response({'detail': f'download failed: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)

            result = _extract_zip(project, request.user, tmp_path, use_cloudinary)
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

        if 'error' in result:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_201_CREATED)
