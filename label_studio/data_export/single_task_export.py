"""Per-task and bulk-by-id task export — Fixensy.

Endpoints:

    GET /api/projects/<pk>/tasks/<task_id>/export/
        Returns one task as JSON. `Content-Disposition` filename = clean_name.json.

    POST /api/projects/<pk>/export/tasks/
        body: {"task_ids": [12, 17, 23]}
        Returns a portable JSON file:
          - One JSON object per task, list-form (AI-pipeline ready).
          - clean_name + source_url + annotations + labels + duration + segments.
          - completed_by_email instead of numeric id (cross-server safe).
          - No localhost/data paths leaked.
        If exactly one task_id is in the list, the response is a single-task
        JSON named after its clean_name. Multiple tasks → bundled list named
        `<project>-export-N.json`.
"""
from __future__ import annotations

import json
import os
import re
from urllib.parse import quote

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils.filename import clean_filename
from data_export.serializers import BaseExportDataSerializer
from projects.models import Project
from tasks.models import Task

_FS_SAFE = re.compile(r'[^A-Za-z0-9._\- ]+')


def _safe_basename(name: str, fallback: str) -> str:
    name = (name or '').strip() or fallback
    name = _FS_SAFE.sub('_', name)
    return name[:200] or fallback


def _portable_payload(task: Task) -> dict:
    """Strip every server-local detail. Output is fit for AI pipelines."""
    serializer = BaseExportDataSerializer(task)
    raw = serializer.data
    data = task.data if isinstance(task.data, dict) else {}

    source_url = data.get('source_url') if isinstance(data.get('source_url'), str) else None
    if not source_url:
        # Fallback: any http(s) value from data.
        for v in data.values():
            if isinstance(v, str) and v.startswith('http'):
                source_url = v
                break

    file_name = (
        (isinstance(data.get('clean_name'), str) and data['clean_name'])
        or clean_filename(source_url or data.get('filename') or '')
        or os.path.splitext(data.get('filename') or '')[0]
        or f'task-{task.id}'
    )

    annotations = []
    labels: set[str] = set()
    segments = []
    duration = 0.0

    for ann in raw.get('annotations', []) or []:
        cleaned = {
            'id': ann.get('id'),
            'created_at': ann.get('created_at'),
            'updated_at': ann.get('updated_at'),
            'completed_by_email': ann.get('completed_by_email'),
            'was_cancelled': ann.get('was_cancelled'),
            'ground_truth': ann.get('ground_truth'),
            'lead_time': ann.get('lead_time'),
            'result': ann.get('result') or [],
        }
        annotations.append(cleaned)

        for r in cleaned['result']:
            try:
                v = r.get('value') or {}
                if 'labels' in v and isinstance(v['labels'], list):
                    for lbl in v['labels']:
                        labels.add(str(lbl))
                if isinstance(v.get('start'), (int, float)) and isinstance(v.get('end'), (int, float)):
                    seg = {
                        'start': float(v['start']),
                        'end': float(v['end']),
                        'channel': v.get('channel'),
                        'labels': v.get('labels') or [],
                    }
                    if isinstance(v.get('text'), list):
                        seg['text'] = v['text']
                    if 'choices' in v:
                        seg['choices'] = v.get('choices')
                    segments.append(seg)
                    duration = max(duration, float(v['end']))
            except Exception:
                continue

    return {
        'file_name': file_name,
        'source_url': source_url,
        'duration': round(duration, 3),
        'labels': sorted(labels),
        'segments': segments,
        'annotations': annotations,
    }


class SingleTaskExportAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, task_id):
        project = get_object_or_404(Project, pk=pk)
        if not project.has_permission(request.user):
            return Response({'detail': 'forbidden'}, status=403)

        task = get_object_or_404(Task, pk=task_id, project=project)
        payload = _portable_payload(task)
        download_name = _safe_basename(payload.get('file_name') or f'task-{task.id}', f'task-{task.id}') + '.json'

        body = json.dumps(payload, ensure_ascii=False, indent=2)
        resp = HttpResponse(body, content_type='application/json; charset=utf-8')
        resp['Content-Disposition'] = (
            f'attachment; filename="{download_name}"; '
            f"filename*=UTF-8''{quote(download_name)}"
        )
        return resp


class BulkTaskExportAPI(APIView):
    """Checkbox-driven export. Body: {task_ids: [...], export_type?: "JSON"|...}.

    - export_type omitted or "JSON" / "FIXENSY_JSON" → portable Fixensy JSON
      (clean_name + source_url + portable annotations).  Single id returns a
      single task object, named after its clean_name.  Multiple ids return a
      list bundled in one file.
    - Any other export_type ("CSV", "TSV", "ASR_MANIFEST", "JSON_MIN",
      "CONLL2003", ...) → routes through Label Studio's own export pipeline,
      filtered to the chosen tasks only.  Output filename uses clean_name when
      a single task is selected, otherwise `<project>-tasks-N`.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        if not project.has_permission(request.user):
            return Response({'detail': 'forbidden'}, status=403)

        ids = request.data.get('task_ids')
        if not isinstance(ids, list) or not ids or not all(isinstance(i, int) for i in ids):
            return Response({'detail': 'task_ids must be a non-empty list of integers'}, status=400)

        export_type = (request.data.get('export_type') or 'JSON').upper()

        tasks = list(
            Task.objects.filter(project=project, pk__in=ids)
            .select_related('project')
            .prefetch_related('annotations')
        )
        if not tasks:
            return Response({'detail': 'no matching tasks'}, status=404)

        # Preserve incoming order.
        order = {tid: idx for idx, tid in enumerate(ids)}
        tasks.sort(key=lambda t: order.get(t.id, 1_000_000))

        # Compute download base name once.
        if len(tasks) == 1:
            t = tasks[0]
            data = t.data if isinstance(t.data, dict) else {}
            file_name = (
                (isinstance(data.get('clean_name'), str) and data['clean_name'])
                or clean_filename(data.get('source_url') or data.get('filename') or '')
                or f'task-{t.id}'
            )
            base = _safe_basename(file_name, f'task-{t.id}')
        else:
            base = _safe_basename(project.title, f'project-{project.id}') + f'-tasks-{len(tasks)}'

        if export_type in ('JSON', 'FIXENSY_JSON', ''):
            if len(tasks) == 1:
                body = json.dumps(_portable_payload(tasks[0]), ensure_ascii=False, indent=2)
                download_name = base + '.json'
                resp = HttpResponse(body, content_type='application/json; charset=utf-8')
                resp['Content-Disposition'] = (
                    f'attachment; filename="{download_name}"; '
                    f"filename*=UTF-8''{quote(download_name)}"
                )
                return resp

            # Multiple tasks → ZIP, one JSON per task named after its clean_name.
            import io
            import zipfile

            buf = io.BytesIO()
            seen: dict[str, int] = {}
            with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
                for t in tasks:
                    payload = _portable_payload(t)
                    fname = _safe_basename(payload.get('file_name') or f'task-{t.id}', f'task-{t.id}')
                    # collision-safe name within the ZIP only
                    if fname in seen:
                        seen[fname] += 1
                        fname = f'{fname}-{seen[fname]}'
                    else:
                        seen[fname] = 0
                    zf.writestr(f'{fname}.json', json.dumps(payload, ensure_ascii=False, indent=2))
            buf.seek(0)
            download_name = base + '.zip'
            resp = HttpResponse(buf.getvalue(), content_type='application/zip')
            resp['Content-Disposition'] = (
                f'attachment; filename="{download_name}"; '
                f"filename*=UTF-8''{quote(download_name)}"
            )
            return resp

        # Route through Label Studio's own export pipeline for other formats.
        from data_export.models import DataExport
        from data_export.serializers import ExportDataSerializer

        hostname = request.build_absolute_uri('/')
        ext_for_type = {
            'CSV': '.csv', 'TSV': '.tsv', 'JSON': '.json', 'JSON_MIN': '.json',
            'ASR_MANIFEST': '.json', 'CONLL2003': '.conll', 'COCO': '.json',
            'YOLO': '.zip', 'PASCAL_VOC_XML': '.zip',
        }
        ext = ext_for_type.get(export_type, '.txt')

        def _serialize_one(t):
            return ExportDataSerializer(
                [t], many=True, expand=['drafts'],
                context={'hostname': hostname, 'interpolate_key_frames': False},
            ).data

        def _gen(serialized):
            stream, ctype, fname = DataExport.generate_export_file(
                project, serialized, export_type, False, request.GET, hostname=hostname,
            )
            payload = stream.read() if hasattr(stream, 'read') else stream
            return payload, ctype, fname

        # Single task -> direct file with clean_name + ext.
        if len(tasks) == 1:
            try:
                payload, ctype, _ = _gen(_serialize_one(tasks[0]))
            except Exception as exc:
                return Response({'detail': f'export pipeline error: {exc}'}, status=400)
            download_name = base + ext
            resp = HttpResponse(payload, content_type=ctype)
            resp['Content-Disposition'] = (
                f'attachment; filename="{download_name}"; '
                f"filename*=UTF-8''{quote(download_name)}"
            )
            resp['X-Accel-Buffering'] = 'no'
            return resp

        # Multi-task -> ZIP, one file per task in the chosen format.
        import io
        import zipfile

        buf = io.BytesIO()
        seen: dict[str, int] = {}
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for t in tasks:
                try:
                    payload, _ctype, _fname = _gen(_serialize_one(t))
                except Exception as exc:
                    payload = (f'export error: {exc}').encode('utf-8')
                tdata = t.data if isinstance(t.data, dict) else {}
                fname = (
                    (isinstance(tdata.get('clean_name'), str) and tdata['clean_name'])
                    or clean_filename(tdata.get('source_url') or tdata.get('filename') or '')
                    or f'task-{t.id}'
                )
                fname = _safe_basename(fname, f'task-{t.id}')
                if fname in seen:
                    seen[fname] += 1
                    fname = f'{fname}-{seen[fname]}'
                else:
                    seen[fname] = 0
                zf.writestr(f'{fname}{ext}', payload)
        buf.seek(0)
        download_name = base + '.zip'
        resp = HttpResponse(buf.getvalue(), content_type='application/zip')
        resp['Content-Disposition'] = (
            f'attachment; filename="{download_name}"; '
            f"filename*=UTF-8''{quote(download_name)}"
        )
        resp['X-Accel-Buffering'] = 'no'
        return resp
