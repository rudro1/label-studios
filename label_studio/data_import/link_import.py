"""Link-only ingest — zero VPS storage.

Stores ONLY the remote URL + original filename per task. Audio/image bytes
never hit local disk. Browser streams directly from Cloudinary / Google Drive
through a short proxy that adds Range support + auth headers if needed.

Endpoints:
    POST /api/projects/<pk>/import/urls/
        json: {"items": [{"url": "...", "filename": "opt"}, ...]}
        or    {"urls": ["...", "..."]}

    POST /api/projects/<pk>/import/manifest/
        multipart: file=<manifest.txt|manifest.json|manifest.csv>
        One URL per line (txt) or JSON array of {url,filename} or CSV (url,filename).

    POST /api/projects/<pk>/import/drive-folder/
        json: {"folder_id": "...", "api_key": "optional"}
        Lists files via Drive v3 API, stores each as a link-only task.

Filename derivation order:
    1. explicit `filename` in payload
    2. Content-Disposition from HEAD request (optional, off by default)
    3. basename of URL path
    4. Google Drive: `name` field from Drive API
"""
from __future__ import annotations

import csv
import io
import json
import logging
import os
import re
from typing import Iterable
from urllib.parse import unquote, urlparse

import requests
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import Project
from tasks.models import Task

logger = logging.getLogger(__name__)

AUDIO_EXTS = ('.wav', '.mp3', '.flac', '.ogg', '.m4a', '.webm')
IMAGE_EXTS = ('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp')
VIDEO_EXTS = ('.mp4', '.mov')

MAX_ITEMS = 10000


def _data_key_for(ext: str) -> str:
    ext = ext.lower()
    if ext in AUDIO_EXTS:
        return 'audio'
    if ext in IMAGE_EXTS:
        return 'image'
    if ext in VIDEO_EXTS:
        return 'video'
    return 'file'


def _basename_from_url(url: str) -> str:
    try:
        path = urlparse(url).path
        return unquote(os.path.basename(path)) or 'file'
    except Exception:
        return 'file'


def _drive_direct_url(url_or_id: str) -> str:
    """Normalize Google Drive share URL to streaming URL.
    Accepts /file/d/<id>/view, open?id=<id>, or a bare id.
    """
    m = re.match(r'https?://drive\.google\.com/file/d/([^/]+)', url_or_id)
    if m:
        return f'https://drive.google.com/uc?export=download&id={m.group(1)}'
    m = re.match(r'https?://drive\.google\.com/open\?id=([^&]+)', url_or_id)
    if m:
        return f'https://drive.google.com/uc?export=download&id={m.group(1)}'
    if re.match(r'^[A-Za-z0-9_-]{20,}$', url_or_id):
        return f'https://drive.google.com/uc?export=download&id={url_or_id}'
    return url_or_id


def _normalize(item) -> dict | None:
    """Accept string URL or {url, filename}. Return {url, filename, ext}."""
    if isinstance(item, str):
        url = item.strip()
        filename = None
    elif isinstance(item, dict):
        url = (item.get('url') or '').strip()
        filename = item.get('filename')
    else:
        return None
    if not url or not url.startswith(('http://', 'https://')):
        return None

    # Google Drive normalization.
    if 'drive.google.com' in url:
        url = _drive_direct_url(url)

    if not filename:
        filename = _basename_from_url(url)
    ext = os.path.splitext(filename)[1].lower()
    return {'url': url, 'filename': filename, 'ext': ext}


def _create_tasks(project: Project, items: Iterable[dict]) -> dict:
    from core.utils.filename import clean_filename

    created = 0
    task_ids: list[int] = []
    for it in items:
        ext = it['ext']
        clean = clean_filename(it['url']) or os.path.splitext(it['filename'])[0]
        task = Task.objects.create(
            project=project,
            data={
                _data_key_for(ext): it['url'],
                'filename': it['filename'],
                'clean_name': clean,
                'source_url': it['url'],
            },
            meta={'clean_name': clean},
        )
        task_ids.append(task.id)
        created += 1
    return {'created_tasks': created, 'task_ids': task_ids}


def _require_project(request, pk) -> Project | Response:
    project = get_object_or_404(Project, pk=pk)
    if not project.has_permission(request.user):
        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    return project


class UrlListImportAPI(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, pk):
        project = _require_project(request, pk)
        if isinstance(project, Response):
            return project

        payload = request.data if isinstance(request.data, dict) else {}
        raw = payload.get('items') or payload.get('urls') or []
        if not isinstance(raw, list) or not raw:
            return Response({'detail': 'items (list) or urls (list) required'}, status=400)
        if len(raw) > MAX_ITEMS:
            return Response({'detail': f'too many items; limit {MAX_ITEMS}'}, status=400)

        normalized = []
        skipped = []
        for idx, it in enumerate(raw):
            n = _normalize(it)
            if n is None:
                skipped.append({'index': idx, 'reason': 'invalid url'})
                continue
            normalized.append(n)

        result = _create_tasks(project, normalized)
        result['skipped'] = skipped
        return Response(result, status=status.HTTP_201_CREATED)


class ManifestImportAPI(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        project = _require_project(request, pk)
        if isinstance(project, Response):
            return project

        upload = request.FILES.get('file')
        if not upload:
            return Response({'detail': 'file is required'}, status=400)
        raw = upload.read().decode('utf-8', errors='replace')
        ext = os.path.splitext(upload.name or '')[1].lower()

        items: list = []
        if ext == '.json':
            try:
                parsed = json.loads(raw)
            except ValueError:
                return Response({'detail': 'invalid JSON manifest'}, status=400)
            if isinstance(parsed, list):
                items = parsed
            elif isinstance(parsed, dict) and 'items' in parsed:
                items = parsed['items']
            else:
                return Response({'detail': 'JSON must be list or {items:[...]}'}, status=400)
        elif ext == '.csv':
            reader = csv.DictReader(io.StringIO(raw))
            for row in reader:
                items.append({'url': row.get('url', ''), 'filename': row.get('filename')})
        else:
            # txt: one URL per line, optional "\t<filename>" suffix
            for line in raw.splitlines():
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '\t' in line:
                    url, fname = line.split('\t', 1)
                    items.append({'url': url.strip(), 'filename': fname.strip()})
                else:
                    items.append(line)

        if len(items) > MAX_ITEMS:
            return Response({'detail': f'too many items; limit {MAX_ITEMS}'}, status=400)

        normalized, skipped = [], []
        for idx, it in enumerate(items):
            n = _normalize(it)
            if n is None:
                skipped.append({'index': idx, 'reason': 'invalid url'})
                continue
            normalized.append(n)

        result = _create_tasks(project, normalized)
        result['skipped'] = skipped
        return Response(result, status=status.HTTP_201_CREATED)


class DriveFolderImportAPI(APIView):
    """List a public Drive folder and import each file link-only."""
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, pk):
        project = _require_project(request, pk)
        if isinstance(project, Response):
            return project

        payload = request.data if isinstance(request.data, dict) else {}
        folder_id = (payload.get('folder_id') or '').strip()
        api_key = payload.get('api_key') or os.environ.get('GOOGLE_DRIVE_API_KEY')
        if not folder_id:
            return Response({'detail': 'folder_id required'}, status=400)
        if not api_key:
            return Response(
                {'detail': 'api_key required (or set GOOGLE_DRIVE_API_KEY env)'},
                status=400,
            )

        # Paginated listing via Drive v3 files.list.
        items, page_token = [], None
        try:
            while True:
                params = {
                    'q': f"'{folder_id}' in parents and trashed=false",
                    'fields': 'nextPageToken,files(id,name,mimeType,size)',
                    'pageSize': 1000,
                    'key': api_key,
                }
                if page_token:
                    params['pageToken'] = page_token
                r = requests.get(
                    'https://www.googleapis.com/drive/v3/files',
                    params=params, timeout=30,
                )
                r.raise_for_status()
                body = r.json()
                for f in body.get('files', []):
                    items.append({
                        'url': f'https://drive.google.com/uc?export=download&id={f["id"]}',
                        'filename': f.get('name') or f['id'],
                    })
                page_token = body.get('nextPageToken')
                if not page_token:
                    break
                if len(items) >= MAX_ITEMS:
                    break
        except requests.RequestException as exc:
            return Response({'detail': f'drive list failed: {exc}'}, status=502)

        normalized, skipped = [], []
        for idx, it in enumerate(items):
            n = _normalize(it)
            if n is None:
                skipped.append({'index': idx, 'reason': 'invalid url'})
                continue
            normalized.append(n)

        result = _create_tasks(project, normalized)
        result['skipped'] = skipped
        return Response(result, status=status.HTTP_201_CREATED)
