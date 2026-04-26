"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import csv
import io
import logging
import mimetypes
import os
import re

try:
    import ujson as json
except:  # noqa: E722
    import json

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


def convert_google_drive_link(url):
    """Convert Google Drive view link to download link for direct file access"""
    if not url or not isinstance(url, str):
        return url
    if 'drive.google.com' in url and '/view' in url:
        match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
        if match:
            file_id = match.group(1)
            return f'https://drive.google.com/uc?export=download&id={file_id}'
    return url


def is_external_url(url):
    """Check if the URL is an external cloud source"""
    if not url or not isinstance(url, str):
        return False
    external_domains = [
        'drive.google.com',
        'cloudinary.com',
        'res.cloudinary.com',
        'dropbox.com',
        's3.amazonaws.com',
        'storage.googleapis.com',
        'blob.core.windows.net',
        'githubusercontent.com',
        'github.com',
        'gitlab.com',
        'bitbucket.org'
    ]
    return any(domain in url for domain in external_domains)


def get_filename_from_url(url):
    """Try to get the real human-readable filename from a URL by checking headers."""
    response = None
    try:
        import requests
        import re
        import urllib.parse
        
        # Don't download the whole file, just headers and enough to get disposition
        response = requests.get(url, stream=True, allow_redirects=True, timeout=10)
        
        # 1. Try Content-Disposition header (The most reliable for GDrive/Cloudinary)
        cd = response.headers.get('Content-Disposition')
        if cd:
            # Try to match filename="..."
            fname = re.findall('filename="(.+)"', cd)
            if fname: return fname[0]
            # Try to match filename*=UTF-8''...
            fname = re.findall(r"filename\*=UTF-8''(.+)", cd)
            if fname: 
                return urllib.parse.unquote(fname[0])

        # 2. Try the final URL's path if headers didn't work
        final_url = response.url
        path = urllib.parse.urlparse(final_url).path
        fname = os.path.basename(path)
        if fname and '.' in fname:
            return fname

        # 3. Fallback: If it's still a GDrive link, we might not get a name easily
        # but let's at least return something unique from the URL
        if 'drive.google.com' in url:
            id_match = re.search(r'(?:id=|[/\b])([a-zA-Z0-9_-]{25,})', url)
            if id_match: return f"gdrive_{id_match.group(1)}"
    except Exception as e:
        logger.warning(f"Could not get filename from URL {url}: {e}")
    finally:
        if response is not None:
            try:
                response.close()
            except Exception:
                pass

    return os.path.basename(url.split('?')[0]) or 'unknown'


_MEDIA_URL_EXTS = (
    '.wav', '.mp3', '.flac', '.ogg', '.m4a', '.webm',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp',
    '.mp4', '.mov',
)


def _link_only_task(url: str) -> dict:
    """Build a Task payload that stores the remote URL without downloading.
    Fixensy link-only mode — zero VPS disk use for media files.
    """
    from urllib.parse import unquote, urlparse

    from core.utils.filename import clean_filename

    path = urlparse(url).path
    filename = unquote(os.path.basename(path)) or 'file'
    ext = os.path.splitext(filename)[1].lower()
    key = 'audio' if ext in ('.wav', '.mp3', '.flac', '.ogg', '.m4a', '.webm') else (
          'image' if ext in ('.png', '.jpg', '.jpeg', '.gif', '.bmp') else (
          'video' if ext in ('.mp4', '.mov') else settings.DATA_UNDEFINED_NAME))
    clean = clean_filename(url) or os.path.splitext(filename)[0]
    return {
        'data': {
            key: url,
            'filename': filename,
            'clean_name': clean,
            'source_url': url,
        },
        'source_file_name': filename,
        'meta': {'source_file_name': filename, 'clean_name': clean},
    }


def tasks_from_url(file_upload_ids, project, user, url, could_be_tasks_list):
    """Download file using URL and read tasks from it.

    Fixensy short-circuit: if the URL points at a media file (audio/image/video),
    we store ONLY the link — no bytes copied to VPS disk. Task data points at
    the remote URL directly and the browser streams it on demand.
    """
    original_url = url
    try:
        # Convert Google Drive link to direct download link if necessary
        url = convert_google_drive_link(url)
        filename = url.rsplit('/', 1)[-1]

        # Fixensy link-only short-circuit for media.
        lower_filename = filename.lower().split('?', 1)[0]
        if (
            os.environ.get('FIXENSY_LINK_ONLY', '1') != '0'
            and url.startswith(('http://', 'https://'))
            and os.path.splitext(lower_filename)[1] in _MEDIA_URL_EXTS
        ):
            link_task = _link_only_task(url)
            tasks = [link_task]

            # Persist a tiny JSON stub FileUpload so the UI "Import" button
            # (reimportFiles + file_upload_ids) has something to commit. The stub
            # holds ONLY the task metadata (<1KB) — no audio bytes hit disk.
            import json as _json
            from django.core.files.base import ContentFile
            stub_name = f'{os.path.splitext(filename)[0] or "link"}.json'
            stub_body = _json.dumps([{'data': link_task['data']}]).encode('utf-8')
            stub_upload = create_file_upload(user, project, ContentFile(stub_body, name=stub_name))
            file_upload_ids.append(stub_upload.id)
            if stub_upload.format_could_be_tasks_list:
                could_be_tasks_list = True

            return (
                [settings.DATA_UNDEFINED_NAME], {'url'}, tasks, file_upload_ids, could_be_tasks_list,
            )

        response = ssrf_safe_get(
            url, verify=project.organization.should_verify_ssl_certs(), stream=True, headers={'Accept-Encoding': None}
        )

        try:
            resolved_url = response.url if hasattr(response, 'url') else url
            if resolved_url != url:
                from urllib.parse import unquote, urlparse
                parsed_url = urlparse(resolved_url)
                path = unquote(parsed_url.path)
                resolved_filename = path.rsplit('/', 1)[-1]
                if '?' in resolved_filename:
                    resolved_filename = resolved_filename.split('?')[0]
                _, resolved_ext = os.path.splitext(resolved_filename)
                filename = resolved_filename

            _, ext = os.path.splitext(filename)
            if ext and ext.lower() not in settings.SUPPORTED_EXTENSIONS:
                raise ValidationError(f'{ext} extension is not supported')

            content_length = response.headers.get('content-length')
            if content_length:
                check_tasks_max_file_size(int(content_length))

            file_content = response.content
            file_upload = create_file_upload(user, project, SimpleUploadedFile(filename, file_content))
            if file_upload.format_could_be_tasks_list:
                could_be_tasks_list = True
            file_upload_ids.append(file_upload.id)
            tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)

            is_external = is_external_url(original_url)

            if is_external or (original_url.startswith('http') and not could_be_tasks_list):
                final_url = convert_google_drive_link(original_url)
                # Try to get the real human-readable filename from Drive headers
                real_filename = get_filename_from_url(final_url)

                for task in tasks:
                    # CRITICAL: Always use the Cloud URL directly in the data
                    # This prevents local /data/upload/ paths from being created
                    task['data'] = {settings.DATA_UNDEFINED_NAME: final_url}

                    # IMPORTANT: Save original human-readable filename for export naming
                    task['source_file_name'] = real_filename
                    if not task.get('meta'):
                        task['meta'] = {}
                    task['meta']['source_file_name'] = real_filename
        finally:
            try:
                response.close()
            except Exception:
                pass

    except ValidationError as e:
        raise e
    except Exception as e:
        raise ValidationError(extract_message(e))
    return data_keys, found_formats, tasks, file_upload_ids, could_be_tasks_list


@timeit
def create_file_uploads(user, project, FILES):
    could_be_tasks_list = False
    file_upload_ids = []
    if FILES and getattr(settings, 'FIXSTUDIO_REFERENCE_ONLY', False):
        raise ValidationError(
            'Raw file uploads are disabled on this server. Import via URL or '
            'cloud-storage reference instead (set FIXSTUDIO_REFERENCE_ONLY=False to allow uploads).'
        )
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

    if project_import.file_upload_ids:
        file_upload_ids = project_import.file_upload_ids
        tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(
            project_import.project, file_upload_ids
        )

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
        for filename, file in request.FILES.items():
            file_upload = create_file_upload(request.user, project, file)
            if file_upload.format_could_be_tasks_list:
                could_be_tasks_list = True
            file_upload_ids.append(file_upload.id)
        tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)

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
