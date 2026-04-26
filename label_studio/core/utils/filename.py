"""Filename normalization helpers — Fixensy.

Public API:
    clean_filename(name_or_url) -> str
        Returns a human-readable file name with the trailing Cloudinary-style
        random hash and the file extension stripped.

Examples:
    Copy_of_Bengali_std_26_lzm5vk.wav      -> Copy_of_Bengali_std_26
    Copy_of_Bengali_std_27_rxiun6.wav      -> Copy_of_Bengali_std_27
    audio_file_abc123_xk9mzp.mp3           -> audio_file_abc123
    riverside_self_care___mar_07.wav       -> riverside_self_care___mar_07
    https://res.cloudinary.com/.../foo_xy3pq9.mp4 -> foo

Design:
    - URL is reduced to the last path segment first.
    - Optional `?query` and `#fragment` are stripped.
    - Extension `.wav/.mp3/.mp4/.png/...` removed if present in `_KNOWN_EXTS`.
    - Trailing `_[a-z0-9]{6,8}` (Cloudinary public_id suffix) removed exactly
      once.  We require at least 6 chars and at most 8 to avoid eating real
      identifiers like `..._26` (2 digits stays).
"""
from __future__ import annotations

import os
import re
from urllib.parse import unquote, urlparse

_KNOWN_EXTS = {
    '.wav', '.mp3', '.flac', '.ogg', '.m4a', '.webm', '.aac', '.opus',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp',
    '.mp4', '.mov', '.mkv', '.avi',
    '.txt', '.csv', '.tsv', '.json', '.pdf', '.html', '.htm', '.xml',
}
_HASH_SUFFIX = re.compile(r'_[a-z0-9]{6,8}$', re.IGNORECASE)


def _looks_like_hash(token: str) -> bool:
    """A Cloudinary-style hash mixes letters AND digits; pure-letter or
    pure-digit tokens are kept (e.g. `_26` or `_nepvaa`)."""
    has_alpha = any(c.isalpha() for c in token)
    has_digit = any(c.isdigit() for c in token)
    return has_alpha and has_digit
_LEGACY_UUID_PREFIX = re.compile(r'^[0-9a-f]{8}-(.+)$', re.IGNORECASE)
_TRAILING_WS = re.compile(r'\s+$')


def clean_filename(value: str) -> str:
    """Return a stripped, human-readable filename. Never raises."""
    if not isinstance(value, str) or not value.strip():
        return ''

    # If looks like a URL, take last path segment.
    raw = value.strip()
    if raw.startswith(('http://', 'https://')):
        try:
            path = urlparse(raw).path or raw
        except Exception:
            path = raw
        raw = unquote(os.path.basename(path) or path)
    else:
        raw = unquote(os.path.basename(raw))

    # Strip any pre-existing UUID prefix from legacy uploader.
    m = _LEGACY_UUID_PREFIX.match(raw)
    if m:
        raw = m.group(1)

    # Drop extension.
    stem, ext = os.path.splitext(raw)
    if ext.lower() in _KNOWN_EXTS:
        raw = stem
    else:
        raw = stem if not ext else (stem + ext if ext.lower() not in _KNOWN_EXTS else stem)

    # Strip Cloudinary / S3 / Drive style trailing `_<hash>` (6-8 chars).
    # Hash heuristic: alphanumeric mix; pure letters or pure digits stay.
    m = _HASH_SUFFIX.search(raw)
    if m and _looks_like_hash(m.group(0)[1:]):
        raw = raw[: m.start()]

    return _TRAILING_WS.sub('', raw).strip()
