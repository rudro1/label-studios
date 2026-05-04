"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import csv
import io
import json
import logging
import mimetypes
import os

from core.utils.common import timeit
from core.utils.exceptions import extract_message
from core.utils.io import ssrf_safe_get
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import ValidationError

from .models import FileUpload

logger = logging.getLogger(__name__)
csv.field_size_limit(131072 * 10)


def is_binary(f):
    return isinstance(f, (io.RawIOBase, io.BufferedIOBase))


def csv_generate_header(file):
    """Generate column names for headless csv file"""
    file.seek(0)
    names = []
    line = file.readline()

    num_columns = len(line.split(b',' if isinstance(line, bytes) else ','))
    for i in range(num_columns):
        names.append('column' + str(i + 1))
    file.seek(0)
    return names


def check_max_task_number(tasks):
    # max tasks
    if len(tasks) > settings.TASKS_MAX_NUMBER:
        raise ValidationError(
            f'Maximum task number is {settings.TASKS_MAX_NUMBER}, current task number is {len(tasks)}'
        )


def check_tasks_max_file_size(value):
    if value >= settings.TASKS_MAX_FILE_SIZE:
        raise ValidationError(
            f'Maximum total size of all files is {settings.TASKS_MAX_FILE_SIZE} bytes, current size is {value} bytes'
        )


def check_extensions(files):
    for filename, file_obj in files.items():
        _, ext = os.path.splitext(file_obj.name)
        if ext.lower() not in settings.SUPPORTED_EXTENSIONS:
            raise ValidationError(f'{ext} extension is not supported')


def check_request_files_size(files):
    total = sum([file.size for _, file in files.items()])

    check_tasks_max_file_size(total)


def create_file_upload(user, project, file):
    instance = FileUpload(user=user, project=project, file=file)
    if settings.SVG_SECURITY_CLEANUP:
        content_type, encoding = mimetypes.guess_type(str(instance.file.name))
        if content_type in ['image/svg+xml']:
            clean_xml = allowlist_svg(instance.file.read().decode())
            instance.file.seek(0)
            instance.file.write(clean_xml.encode())
            instance.file.truncate()
    instance.save()
    return instance


def allowlist_svg(dirty_xml):
    """Filter out malicious/harmful content from SVG files
    by defining allowed tags
    """
    from lxml.html import clean

    allow_tags = [
        'xml',
        'svg',
        'circle',
        'ellipse',
        'line',
        'path',
        'polygon',
        'vector',
        'rect',
    ]

    cleaner = clean.Cleaner(
        allow_tags=allow_tags,
        style=True,
        links=True,
        add_nofollow=False,
        page_structure=True,
        safe_attrs_only=False,
        remove_unknown_tags=False,
    )

    clean_xml = cleaner.clean_html(dirty_xml)
    return clean_xml


def str_to_json(data):
    try:
        json_acceptable_string = data.replace("'", '"')
        return json.loads(json_acceptable_string)
    except ValueError:
        return None


MEDIA_EXT_TO_KEY = {
    # audio
    '.wav': 'audio', '.mp3': 'audio', '.ogg': 'audio', '.flac': 'audio',
    '.m4a': 'audio', '.aac': 'audio', '.opus': 'audio',
    # video
    '.mp4': 'video', '.webm': 'video', '.mov': 'video', '.avi': 'video', '.mkv': 'video',
    # image
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
    '.bmp': 'image', '.webp': 'image', '.svg': 'image',
}


def _build_media_task_data(media_key, url):
    """Build backward-compatible media payload for different project templates."""
    normalized_url = (url or '').strip()
    data = {media_key: normalized_url}
    # Many existing templates still reference $url for media objects.
    if media_key in {'audio', 'video', 'image'}:
        data.setdefault('url', normalized_url)
    return data


def _media_key_for_url(url):
    """Return ('audio'|'video'|'image', filename) if url points to media, else (None, None)."""
    from urllib.parse import unquote, urlparse
    try:
        path = unquote(urlparse(url).path)
    except Exception:
        return None, None
    filename = path.rsplit('/', 1)[-1]
    if '?' in filename:
        filename = filename.split('?')[0]
    _, ext = os.path.splitext(filename.lower())
    return MEDIA_EXT_TO_KEY.get(ext), filename


def _media_key_for_filename(filename):
    _, ext = os.path.splitext((filename or '').lower())
    return MEDIA_EXT_TO_KEY.get(ext)


def _validate_media_url_accessibility(media_key, url, project):
    """Validate that media URL is reachable and content type matches expected media."""
    expected_prefix = {
        'audio': 'audio/',
        'video': 'video/',
        'image': 'image/',
    }.get(media_key)
    response = ssrf_safe_get(
        url, verify=project.organization.should_verify_ssl_certs(), stream=True, headers={'Accept-Encoding': None}
    )
    try:
        if response.status_code >= 400:
            raise ValidationError(f'Media URL returned HTTP {response.status_code}')
        content_type = (response.headers.get('content-type') or '').lower()
        if expected_prefix and content_type and not content_type.startswith(expected_prefix):
            if 'application/octet-stream' not in content_type:
                raise ValidationError(f'Unexpected media content-type: {content_type}')
        content_length = response.headers.get('content-length')
        if content_length:
            check_tasks_max_file_size(int(content_length))
    finally:
        response.close()


def cloudinary_upload(file_obj, filename):
    """Push file bytes to Cloudinary unsigned upload. Return secure URL.

    Requires env: CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.
    Optional: CLOUDINARY_FOLDER.
    """
    import requests

    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME')
    preset = os.environ.get('CLOUDINARY_UPLOAD_PRESET')
    folder = os.environ.get('CLOUDINARY_FOLDER', '')
    if not cloud_name or not preset:
        return None

    endpoint = f'https://api.cloudinary.com/v1_1/{cloud_name}/auto/upload'
    file_obj.seek(0)
    data = {'upload_preset': preset}
    if folder:
        data['folder'] = folder
    files = {'file': (filename, file_obj.read())}
    resp = requests.post(endpoint, data=data, files=files, timeout=120)
    if resp.status_code >= 400:
        raise ValidationError(f'Cloudinary upload failed: {resp.status_code} {resp.text[:200]}')
    payload = resp.json()
    return payload.get('secure_url') or payload.get('url')


def tasks_from_url(file_upload_ids, project, user, url, could_be_tasks_list):
    """Download file using URL and read tasks from it.

    Media URLs (audio/video/image) bypass download and are stored as link-only tasks
    so raw bytes never land on the VPS. A tiny inplace.json FileUpload is still created
    so that the standard "preview then commit" flow (commit_to_project=false) works.
    """
    normalized_url = (url or '').strip()
    media_key, media_filename = _media_key_for_url(normalized_url)
    if media_key:
        # Validate ext against SUPPORTED_EXTENSIONS for consistent policy
        _, ext = os.path.splitext(media_filename.lower())
        if ext and ext not in settings.SUPPORTED_EXTENSIONS:
            raise ValidationError(f'{ext} extension is not supported')
        _validate_media_url_accessibility(media_key, normalized_url, project)
        task_payload = [{'data': _build_media_task_data(media_key, normalized_url)}]
        # Persist as inplace.json so reimport / preview-commit flows can pick it up
        file_upload = create_file_upload(
            user, project, SimpleUploadedFile('inplace.json', json.dumps(task_payload).encode())
        )
        file_upload_ids.append(file_upload.id)
        tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)
        return list(data_keys), found_formats, tasks, file_upload_ids, could_be_tasks_list

    # process URL with tasks
    try:
        filename = normalized_url.rsplit('/', 1)[-1]

        response = ssrf_safe_get(
            normalized_url,
            verify=project.organization.should_verify_ssl_certs(),
            stream=True,
            headers={'Accept-Encoding': None},
        )

        # Try to get filename from resolved URL after redirects
        resolved_url = response.url if hasattr(response, 'url') else normalized_url
        if resolved_url != normalized_url:
            # Parse filename from the resolved URL after redirect
            from urllib.parse import unquote, urlparse

            parsed_url = urlparse(resolved_url)
            path = unquote(parsed_url.path)
            resolved_filename = path.rsplit('/', 1)[-1]
            # Remove query parameters
            if '?' in resolved_filename:
                resolved_filename = resolved_filename.split('?')[0]
            _, resolved_ext = os.path.splitext(resolved_filename)
            filename = resolved_filename

        # Check content-type to avoid downloading media files even if they don't have an extension
        content_type = (response.headers.get('content-type') or '').lower()
        for m_key, m_prefix in [('audio', 'audio/'), ('video', 'video/'), ('image', 'image/')]:
            if content_type.startswith(m_prefix):
                logger.info(f'URL {normalized_url} has media content-type {content_type}, treating as link-only task.')
                task_payload = [{'data': _build_media_task_data(m_key, normalized_url)}]
                file_upload = create_file_upload(
                    user, project, SimpleUploadedFile('inplace.json', json.dumps(task_payload).encode())
                )
                file_upload_ids.append(file_upload.id)
                tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)
                response.close()
                return list(data_keys), found_formats, tasks, file_upload_ids, could_be_tasks_list

        # Check file extension
        _, ext = os.path.splitext(filename)
        if ext and ext.lower() not in settings.SUPPORTED_EXTENSIONS:
            raise ValidationError(f'{ext} extension is not supported')

        # Check file size before downloading
        content_length = response.headers.get('content-length')
        if content_length:
            check_tasks_max_file_size(int(content_length))

        file_content = response.content
        file_upload = create_file_upload(user, project, SimpleUploadedFile(filename, file_content))
        if file_upload.format_could_be_tasks_list:
            could_be_tasks_list = True
        file_upload_ids.append(file_upload.id)
        tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)

    except ValidationError as e:
        raise e
    except Exception as e:
        raise ValidationError(extract_message(e))
    finally:
        if 'response' in locals():
            response.close()
    return data_keys, found_formats, tasks, file_upload_ids, could_be_tasks_list


@timeit
def create_file_uploads(user, project, FILES):
    could_be_tasks_list = False
    file_upload_ids = []
    check_request_files_size(FILES)
    check_extensions(FILES)
    for _, file in FILES.items():
        file_upload = create_file_upload(user, project, file)
        if file_upload.format_could_be_tasks_list:
            could_be_tasks_list = True
        file_upload_ids.append(file_upload.id)

    logger.debug(f'created file uploads: {file_upload_ids} could_be_tasks_list: {could_be_tasks_list}')
    return file_upload_ids, could_be_tasks_list


def load_tasks_for_async_import(project_import, user):
    """Load tasks from different types of request.data / request.files saved in project_import model"""
    file_upload_ids, found_formats, data_keys = [], [], set()
    extra_tasks = []
    extra_keys = set()
    if project_import.tasks and project_import.file_upload_ids:
        extra_tasks = list(project_import.tasks)
        for t in extra_tasks:
            if isinstance(t, dict) and isinstance(t.get('data'), dict):
                extra_keys |= set(t['data'].keys())

    if project_import.file_upload_ids:
        file_upload_ids = project_import.file_upload_ids
        tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(
            project_import.project, file_upload_ids
        )
        if extra_tasks:
            tasks = list(tasks) + extra_tasks
            data_keys = set(data_keys) | extra_keys

    # take tasks from url address
    elif project_import.url:
        url = project_import.url
        # try to load json with task or tasks from url as string
        json_data = str_to_json(url)
        if json_data:
            file_upload = create_file_upload(
                user,
                project_import.project,
                SimpleUploadedFile('inplace.json', url.encode()),
            )
            file_upload_ids.append(file_upload.id)
            tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(
                project_import.project, file_upload_ids
            )

        # download file using url and read tasks from it
        else:
            could_be_tasks_list = False
            (
                data_keys,
                found_formats,
                tasks,
                file_upload_ids,
                could_be_tasks_list,
            ) = tasks_from_url(file_upload_ids, project_import.project, user, url, could_be_tasks_list)
            if could_be_tasks_list:
                project_import.could_be_tasks_list = True
                project_import.save(update_fields=['could_be_tasks_list'])

    elif project_import.tasks:
        tasks = project_import.tasks

    # check is data root is list
    if not isinstance(tasks, list):
        raise ValidationError('load_tasks: Data root must be list')

    # empty tasks error
    if not tasks:
        raise ValidationError('load_tasks: No tasks added')

    check_max_task_number(tasks)
    return tasks, file_upload_ids, found_formats, list(data_keys)


def load_tasks_for_async_import_streaming(project_import, user, batch_size=1000):
    """Load tasks from different types of request.data / request.files saved in project_import model,
    yielding tasks in batches to reduce memory usage"""
    from django.conf import settings

    if not batch_size:
        batch_size = settings.IMPORT_BATCH_SIZE

    all_file_upload_ids = []
    all_found_formats = {}
    all_data_keys = set()

    if project_import.file_upload_ids:
        file_upload_ids = project_import.file_upload_ids
        all_file_upload_ids = file_upload_ids.copy()

        for batch_tasks, batch_formats, batch_data_keys in FileUpload.load_tasks_from_uploaded_files_streaming(
            project_import.project, file_upload_ids, batch_size=batch_size
        ):
            all_found_formats.update(batch_formats)
            all_data_keys.update(batch_data_keys)

            # Validate each batch
            if not isinstance(batch_tasks, list):
                raise ValidationError('load_tasks: Data root must be list')
            if not batch_tasks:
                continue  # Skip empty batches

            check_max_task_number(batch_tasks)
            yield batch_tasks, file_upload_ids, batch_formats, list(batch_data_keys)

    elif project_import.url:
        # For URL imports, we still need to load everything at once
        # since we don't have streaming support for URL-based imports yet
        url = project_import.url
        file_upload_ids, found_formats, data_keys = [], [], set()

        # try to load json with task or tasks from url as string
        json_data = str_to_json(url)
        if json_data:
            file_upload = create_file_upload(
                user,
                project_import.project,
                SimpleUploadedFile('inplace.json', url.encode()),
            )
            file_upload_ids.append(file_upload.id)
            tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(
                project_import.project, file_upload_ids
            )
        else:
            could_be_tasks_list = False
            (
                data_keys,
                found_formats,
                tasks,
                file_upload_ids,
                could_be_tasks_list,
            ) = tasks_from_url(file_upload_ids, project_import.project, user, url, could_be_tasks_list)
            if could_be_tasks_list:
                project_import.could_be_tasks_list = True
                project_import.save(update_fields=['could_be_tasks_list'])

        if not isinstance(tasks, list):
            raise ValidationError('load_tasks: Data root must be list')
        if not tasks:
            raise ValidationError('load_tasks: No tasks added')

        check_max_task_number(tasks)

        all_file_upload_ids = file_upload_ids.copy()
        all_found_formats = found_formats.copy()
        all_data_keys = data_keys.copy()

        for i in range(0, len(tasks), batch_size):
            batch_tasks = tasks[i : i + batch_size]
            yield batch_tasks, file_upload_ids, found_formats, list(data_keys)

    elif project_import.tasks:
        tasks = project_import.tasks

        if not isinstance(tasks, list):
            raise ValidationError('load_tasks: Data root must be list')
        if not tasks:
            raise ValidationError('load_tasks: No tasks added')

        check_max_task_number(tasks)

        for i in range(0, len(tasks), batch_size):
            batch_tasks = tasks[i : i + batch_size]
            yield batch_tasks, [], {}, []

    else:
        raise ValidationError('load_tasks: No tasks added')

    return all_file_upload_ids, all_found_formats, list(all_data_keys)


def load_tasks(request, project):
    """Load tasks from different types of request.data / request.files"""
    file_upload_ids, found_formats, data_keys = [], [], set()
    could_be_tasks_list = False

    # take tasks from request FILES
    if len(request.FILES):
        check_request_files_size(request.FILES)
        check_extensions(request.FILES)
        cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME')
        preset = os.environ.get('CLOUDINARY_UPLOAD_PRESET')
        cloud_enabled = bool(cloud_name and preset)
        cloud_tasks = []
        cloud_keys = set()
        for _, file in request.FILES.items():
            media_key = _media_key_for_filename(file.name) if cloud_enabled else None
            if media_key:
                url = cloudinary_upload(file, file.name)
                if not url:
                    raise ValidationError('Cloudinary upload returned no URL')
                media_data = _build_media_task_data(media_key, url)
                cloud_tasks.append({'data': media_data})
                cloud_keys.update(media_data.keys())
            else:
                file_upload = create_file_upload(request.user, project, file)
                if file_upload.format_could_be_tasks_list:
                    could_be_tasks_list = True
                file_upload_ids.append(file_upload.id)
        if file_upload_ids:
            tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)
        else:
            tasks, found_formats, data_keys = [], {}, set()
        if cloud_tasks:
            tasks = list(tasks) + cloud_tasks
            data_keys = set(data_keys) | cloud_keys

    # take tasks from url address
    elif 'application/x-www-form-urlencoded' in request.content_type:
        # empty url
        url = request.data.get('url')
        if not url:
            raise ValidationError('"url" is not found in request data')

        # try to load json with task or tasks from url as string
        json_data = str_to_json(url)
        if json_data:
            file_upload = create_file_upload(request.user, project, SimpleUploadedFile('inplace.json', url.encode()))
            file_upload_ids.append(file_upload.id)
            tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)

        # download file using url and read tasks from it
        else:
            (
                data_keys,
                found_formats,
                tasks,
                file_upload_ids,
                could_be_tasks_list,
            ) = tasks_from_url(file_upload_ids, project, request.user, url, could_be_tasks_list)

    # take one task from request DATA
    elif 'application/json' in request.content_type and isinstance(request.data, dict):
        tasks = [request.data]

    # take many tasks from request DATA
    elif 'application/json' in request.content_type and isinstance(request.data, list):
        tasks = request.data

    # incorrect data source
    else:
        raise ValidationError('load_tasks: No data found in DATA or in FILES')

    # check is data root is list
    if not isinstance(tasks, list):
        raise ValidationError('load_tasks: Data root must be list')

    # empty tasks error
    if not tasks:
        raise ValidationError('load_tasks: No tasks added')

    check_max_task_number(tasks)
    return tasks, file_upload_ids, could_be_tasks_list, found_formats, list(data_keys)
