"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import json
import os

# Set data directory to local project folder to avoid macOS permission issues in ~/Library
# This must be set before importing base settings
os.environ.setdefault('LABEL_STUDIO_BASE_DATA_DIR', os.path.join(os.getcwd(), 'data'))

from core.settings.base import *  # noqa
from core.utils.secret_key import generate_secret_key_if_missing
import environ as _environ

# Load env files BEFORE reading DJANGO_DB so PostgreSQL settings take effect.
# Keep repo-root .env as the primary source of truth, then fill missing values from legacy local files.
_env_candidates = []

if os.environ.get('ENV_FILE'):
    _env_candidates.append(os.environ['ENV_FILE'])

_cwd = os.getcwd()
_env_candidates.extend(
    [
        os.path.join(_cwd, '.env'),
        os.path.join(_cwd, 'label_studio', 'data', '.env'),
        os.path.join(_cwd, 'data', '.env'),
    ]
)

_loaded_env_files = []
for _env_file in dict.fromkeys(_env_candidates):
    if os.path.exists(_env_file):
        _environ.Env.read_env(_env_file, overwrite=False)
        _loaded_env_files.append(_env_file)

if _loaded_env_files:
    print(f"Read environment variables from: {', '.join(_loaded_env_files)}")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = generate_secret_key_if_missing(BASE_DATA_DIR)

# Fixensy: default to PostgreSQL for VPS/Docker, but allow explicit local sqlite fallback.
DJANGO_DB = get_env('DJANGO_DB', DJANGO_DB_POSTGRESQL)
if DJANGO_DB in {'default', DJANGO_DB_POSTGRESQL}:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'USER': get_env('POSTGRE_USER', 'postgres'),
            'PASSWORD': get_env('POSTGRE_PASSWORD', 'postgres'),
            'NAME': get_env('POSTGRE_NAME', 'fixensy'),
            'HOST': get_env('POSTGRE_HOST', 'localhost'),
            'PORT': int(get_env('POSTGRE_PORT', '5432')),
        }
    }
elif DJANGO_DB == DJANGO_DB_SQLITE:
    DATABASES = {'default': DATABASES_ALL[DJANGO_DB_SQLITE]}
else:
    DATABASES = {'default': DATABASES_ALL.get(DJANGO_DB, DATABASES_ALL[DJANGO_DB_POSTGRESQL])}

MIDDLEWARE.append('organizations.middleware.DummyGetSessionMiddleware')
MIDDLEWARE.append('core.middleware.UpdateLastActivityMiddleware')
if INACTIVITY_SESSION_TIMEOUT_ENABLED:
    MIDDLEWARE.append('core.middleware.InactivitySessionTimeoutMiddleWare')

ADD_DEFAULT_ML_BACKENDS = False

LOGGING['root']['level'] = get_env('LOG_LEVEL', 'WARNING')

DEBUG = True

# Merge localhost defaults with HOSTNAME (from env HOST / LABEL_STUDIO_HOST via compose) and CSRF_TRUSTED_ORIGINS from env.
_default_csrf_origins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://0.0.0.0:8080',
    'http://0.0.0.0:8081',
]
_env_csrf = list(CSRF_TRUSTED_ORIGINS) if CSRF_TRUSTED_ORIGINS else []
_host_csrf = [HOSTNAME] if HOSTNAME else []
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys([*_default_csrf_origins, *_host_csrf, *_env_csrf]))

if get_bool_env('LABEL_STUDIO_BEHIND_PROXY', False):
    USE_X_FORWARDED_HOST = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False
CSRF_USE_SESSIONS = False
CSRF_COOKIE_SAMESITE = 'Lax'

LINK_ONLY_IMPORT = False

SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'

SENTRY_DSN = get_env('SENTRY_DSN', 'https://68b045ab408a4d32a910d339be8591a4@o227124.ingest.sentry.io/5820521')
SENTRY_ENVIRONMENT = get_env('SENTRY_ENVIRONMENT', 'opensource')

FRONTEND_SENTRY_DSN = get_env(
    'FRONTEND_SENTRY_DSN', 'https://5f51920ff82a4675a495870244869c6b@o227124.ingest.sentry.io/5838868'
)
FRONTEND_SENTRY_ENVIRONMENT = get_env('FRONTEND_SENTRY_ENVIRONMENT', 'opensource')

EDITOR_KEYMAP = json.dumps(get_env('EDITOR_KEYMAP'))

from label_studio import __version__
from label_studio.core.utils import sentry

sentry.init_sentry(release_name='label-studio', release_version=__version__)

# we should do it after sentry init
from label_studio.core.utils.common import collect_versions

versions = collect_versions()

# in Label Studio Community version, feature flags are always ON
FEATURE_FLAGS_DEFAULT_VALUE = True
# or if file is not set, default is using offline mode
FEATURE_FLAGS_OFFLINE = get_bool_env('FEATURE_FLAGS_OFFLINE', True)

FEATURE_FLAGS_FILE = get_env('FEATURE_FLAGS_FILE', 'feature_flags.json')
FEATURE_FLAGS_FROM_FILE = True
try:
    from core.utils.io import find_node

    find_node('label_studio', FEATURE_FLAGS_FILE, 'file')
except IOError:
    FEATURE_FLAGS_FROM_FILE = False

STORAGE_PERSISTENCE = get_bool_env('STORAGE_PERSISTENCE', True)
