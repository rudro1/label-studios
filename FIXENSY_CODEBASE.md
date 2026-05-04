# Fixensy / Fixstudio — Complete Codebase Reference

> Read this file first in any new conversation. It covers everything: what this
> project is, how every custom feature works, where every important file lives,
> and how to deploy/maintain it.

---

## 1. What This Project Is

**Fixstudio** is a heavily-customised fork of [Label Studio](https://github.com/HumanSignal/label-studio)
(open-source data-labelling platform). Upstream LS has been modified to build
**Fixensy's audio annotation pipeline**:

| Layer | Technology |
|---|---|
| Backend | Django + Django REST Framework (Python) |
| DB | PostgreSQL 15 (Docker volume) |
| Frontend | React + MobX-State-Tree (TypeScript/JS) |
| Container | Docker Compose (single VPS) |
| Audio Engine | AudioUltra (in-repo waveform library) |

Default admin: `info@fixensy.com` / `Fixensy01+.owner` (set in `label_studio/server.py:27-28`).

---

## 2. Directory Map

```
.
├── label_studio/               ← Django backend (Python)
│   ├── server.py               ← App entry point; default user
│   ├── core/
│   │   ├── settings/           ← Django settings (label_studio.py is main)
│   │   └── utils/
│   │       └── filename.py     ← clean_filename() — strips Cloudinary hashes
│   ├── annotation_templates/   ← YAML template definitions shown in UI
│   │   └── audio-speech-processing/
│   │       └── fixensy-audio-labeling/
│   │           └── config.yml  ← THE main labeling template
│   ├── data_import/
│   │   ├── uploader.py         ← patched: link-only short-circuit + clean_name
│   │   ├── link_import.py      ← NEW: URL-list / manifest / Drive-folder import
│   │   ├── zip_import.py       ← NEW: ZIP upload + Cloudinary-ZIP import
│   │   └── urls.py             ← registers all import endpoints
│   ├── data_export/
│   │   ├── single_task_export.py ← NEW: per-task + bulk-by-id JSON export
│   │   └── urls.py             ← registers export endpoints
│   ├── tasks/                  ← Task/Annotation models + API
│   ├── projects/               ← Project model + API
│   ├── organizations/          ← Multi-org support
│   └── ml/                     ← ML backend integrations (Whisper lives here upstream)
│
├── web/
│   └── libs/editor/src/        ← Label Studio Frontend (React/MST)
│       ├── tags/object/Audio/
│       │   ├── view.tsx        ← HEAVILY PATCHED: all Fixensy audio UX
│       │   └── view.prefix.css ← ALL Fixensy CSS (zoom bar, dark mode, segments)
│       ├── mixins/
│       │   └── Required.js     ← PATCHED: toast on missing required field
│       └── regions/
│           └── Result.js       ← PATCHED: validation + required handling
│
├── deploy/
│   ├── vps-bootstrap.sh        ← One-shot VPS setup
│   ├── vps-backup.sh           ← DB + data backup
│   ├── vps-redeploy.sh         ← Pull + rebuild + restart
│   └── vps-restore.sh          ← Restore from backup
│
├── docker-compose.yml          ← Services: db (postgres:15) + label_studio
├── Dockerfile                  ← Production image
├── .env.example                ← Copy to .env and fill
└── VPS_INSTALL.md              ← Deployment guide
```

---

## 3. Custom Features (Phase 1)

### 3.1 Link-Only Import (zero disk use)

**File:** `label_studio/data_import/link_import.py`

Media files are **never downloaded to VPS**. Only the remote URL is stored per
task. Browser streams directly from Cloudinary / Google Drive / any HTTPS URL.

Three endpoints:

| Endpoint | Method | Payload | What it does |
|---|---|---|---|
| `/api/projects/<pk>/import/urls/` | POST JSON | `{"items":[{"url":"...","filename":"opt"}]}` or `{"urls":["..."]}` | Bulk URL import |
| `/api/projects/<pk>/import/manifest/` | POST multipart | `file=manifest.txt/.json/.csv` | File-based URL list |
| `/api/projects/<pk>/import/drive-folder/` | POST JSON | `{"folder_id":"...","api_key":"..."}` | Google Drive folder |

Each task gets `data = {audio/image/video: url, filename, clean_name, source_url}`.

**File:** `label_studio/data_import/uploader.py` (patched)
- Added `_link_only_task_data()` — called when URL is a media file (.wav, .mp3, etc.)
- Skips download, generates `clean_name` via `clean_filename()`, stores `source_url`.

### 3.2 ZIP Import

**File:** `label_studio/data_import/zip_import.py`

Two endpoints:

| Endpoint | Method | Payload |
|---|---|---|
| `/api/projects/<pk>/import/zip/` | POST multipart | `file=<zipfile>` |
| `/api/projects/<pk>/import/cloudinary-zip/` | POST JSON | `{"url":"https://...zip"}` |

- Preserves **exact original filenames** (no UUID prefix).
- Optionally mirrors to Cloudinary when `CLOUDINARY_URL` env is set.
- Zip-slip protection via `_safe_relpath()`.

### 3.3 Per-Task & Bulk Export

**File:** `label_studio/data_export/single_task_export.py`

| Endpoint | Method | Returns |
|---|---|---|
| `/api/projects/<pk>/tasks/<task_id>/export/` | GET | Single task JSON named `<clean_name>.json` |
| `/api/projects/<pk>/export/tasks/` | POST JSON | `{"task_ids":[12,17]}` → portable JSON |

Export format is **AI-pipeline ready**:
- `clean_name` + `source_url` (no server-local paths leaked)
- `completed_by_email` (not numeric ID — cross-server safe)
- Flattened `segments` with `start/end/labels/text`
- `duration`, `labels` (deduplicated set)

### 3.4 Filename Normalization

**File:** `label_studio/core/utils/filename.py`

`clean_filename(url_or_path) → str`

- Strips Cloudinary/S3 trailing hash suffix (`_xk9mzp`) — 6-8 alphanumeric chars mixed.
- Strips UUID prefix from legacy uploader.
- Strips file extension.
- Example: `Copy_of_Bengali_std_26_lzm5vk.wav` → `Copy_of_Bengali_std_26`

### 3.5 Fixensy Audio Labeling Template

**File:** `label_studio/annotation_templates/audio-speech-processing/fixensy-audio-labeling/config.yml`

YAML template shown in "New Project → Template" dialog. Group: `Fixensy`.

Template features:
- Waveform with segment drawing
- Valid / Invalid label buttons (per segment)
- Speaker selector (radio — CH0/CH1/CH2/Both)
- Transcription textarea (auto-filled by Whisper if configured)
- Whole-audio "Mark as Invalid" section (hidden when any segment exists)
- Custom CSS that hides LS hotkey badges, forces block radio layout, dark mode

### 3.6 Audio View UX Patches

**File:** `web/libs/editor/src/tags/object/Audio/view.tsx` (1157 lines)

All Fixensy-specific logic is prefixed with `// Fixensy:` comments.

Key features added:

| Feature | How |
|---|---|
| **Smooth animated zoom** | `animateZoom()` using `requestAnimationFrame`; FIXENSY_ZOOM_STEP=0.2 |
| **Zoom controls UI** | `+` / `−` buttons + percentage display, pinned top-right of waveform |
| **Wheel/pinch zoom** | `onWheel` + `onPointerDown` (pinch distance tracking) |
| **Segment auto-select** | On `onRegionDrawFinished` → `setSelectedSegment` → shows panel |
| **Whisper auto-transcribe** | `autoTranscribeSegment()` → `POST /api/tasks/transcribe-segment/` |
| **Auto-segment all** | `autoTranscribeAllSegments()` → `POST /api/tasks/transcribe-auto-segments/` |
| **ETA display** | Countdown timer in waveform toolbar |
| **Whole-audio invalid block** | `item._fixensy_wholeAudioSegId` blocks new segment creation |
| **Segment loop-play on click** | Replays only the clicked segment on each click |
| **Tab navigation plays** | Tab through segments → auto-plays the selected one |
| **Toast on submit** | Calls `window.LS_TOAST.show()` for required-field errors |

**File:** `web/libs/editor/src/tags/object/Audio/view.prefix.css`

Pure CSS customizations injected as a prefix:
- Hides LS hotkey badges globally (`.lsf-hotkey`, `sup`)
- Forces block radio layout (`.ant-radio-wrapper { display:inline-block }`)
- Hides Labels tag (segment labels come from Choices, not Labels)
- Floating zoom control pill (dark glass-morphism style)
- Larger segment drag handles (8px wide)
- Dark-mode color overrides

### 3.7 Required Field Validation

**File:** `web/libs/editor/src/mixins/Required.js`

Patched to call `window.LS_TOAST.show({message, type:'error'})` instead of
only blocking silently. Shows which field is missing by name.

**File:** `web/libs/editor/src/regions/Result.js`

Patched: validation checks propagate correctly to the Required mixin toast path.

---

## 4. Data Flow

### Import → Annotate → Export

```
[User] → Upload UI / API call
    ↓
data_import/uploader.py or link_import.py or zip_import.py
    ↓ creates Task records in PostgreSQL
    ↓ task.data = { audio: <url>, filename, clean_name, source_url }
    ↓
[Browser] loads task → AudioUltra streams audio from URL
    ↓
Annotator draws segments → labels / transcribes
    ↓
Result.js / Required.js validate required fields
    ↓
Annotation saved → PostgreSQL (annotations table)
    ↓
[Export] GET /api/projects/<pk>/tasks/<id>/export/
    → single_task_export.py → portable JSON
    ↓ clean_name.json (no server paths, email not ID)
```

### Whisper Auto-Transcription Flow

```
New segment drawn → view.tsx:autoTranscribeSegment()
    ↓ POST /api/tasks/transcribe-segment/
    ↓   { audio_url, start, end, task:"transcribe" }
    ↓ Backend calls Whisper (if OPENAI_API_KEY set)
    ↓ Returns { text, language, engine }
    ↓ pushTranscriptionIntoTextArea() → fills TextArea tag
    ↓ rememberTranscriptionMeta() → window map for later reference
```

If no `OPENAI_API_KEY` → endpoint returns error → silently skipped, no crash.

---

## 5. API Endpoints (Custom Only)

### Import

```
POST /api/projects/<pk>/import/urls/
POST /api/projects/<pk>/import/manifest/
POST /api/projects/<pk>/import/drive-folder/
POST /api/projects/<pk>/import/zip/
POST /api/projects/<pk>/import/cloudinary-zip/
```

### Export

```
GET  /api/projects/<pk>/tasks/<task_id>/export/
POST /api/projects/<pk>/export/tasks/        body: {"task_ids":[...]}
```

### Transcription (upstream ML backend)

```
POST /api/tasks/transcribe-segment/
     body: { audio_url, start, end, task:"transcribe" }

POST /api/tasks/transcribe-auto-segments/
     body: { audio_url, max_segments:500, task:"transcribe" }
```

---

## 6. Deployment

### First-Time VPS Setup

```bash
git clone <repo> fixensy && cd fixensy
cp .env.example .env
# Edit .env: LABEL_STUDIO_USERNAME, LABEL_STUDIO_PASSWORD,
#            LABEL_STUDIO_HOST, CSRF_TRUSTED_ORIGINS,
#            DJANGO_SECRET_KEY, POSTGRES_PASSWORD
bash deploy/vps-bootstrap.sh
# or with auto docker install:
INSTALL_DOCKER=1 bash deploy/vps-bootstrap.sh
```

App listens on port `8080` (override with `APP_PORT` in `.env`).

### Behind Nginx (recommended)

Set in `.env`:
```
APP_BIND_HOST=127.0.0.1
LABEL_STUDIO_HOST=https://label.example.com
CSRF_TRUSTED_ORIGINS=https://label.example.com
```

### Update / Redeploy

```bash
git pull
bash deploy/vps-redeploy.sh main
```

Or manually:
```bash
docker compose build
docker compose up -d
```

### Backup & Restore

```bash
# Backup
bash deploy/vps-backup.sh /opt/backups/$(date +%Y%m%d)
# Stores: postgres.dump, ls_data.tar.gz, .env snapshot

# Restore
bash deploy/vps-restore.sh /opt/backups/20260429
```

### Docker Volumes (DO NOT wipe in production)

| Volume | Contents |
|---|---|
| `postgres_data` | All annotations, tasks, users, projects |
| `ls_data` | Uploaded files (if any — link-only import uses zero space) |

`docker compose down -v` WIPES BOTH. Never run in production.

---

## 7. Environment Variables (.env)

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` | `admin` | DB user |
| `POSTGRES_PASSWORD` | `securepassword` | DB password |
| `POSTGRES_DB` | `labelstudio` | DB name |
| `LABEL_STUDIO_USERNAME` | — | Admin email |
| `LABEL_STUDIO_PASSWORD` | — | Admin password |
| `LABEL_STUDIO_HOST` | — | Public URL (for links in emails) |
| `CSRF_TRUSTED_ORIGINS` | — | Must match public URL for CSRF |
| `DJANGO_SECRET_KEY` | `changeme` | Must be random in production |
| `APP_PORT` | `8080` | Host port |
| `APP_BIND_HOST` | `0.0.0.0` | Bind address (set 127.0.0.1 behind proxy) |
| `CLOUDINARY_URL` | — | Optional: `cloudinary://key:secret@cloud` |
| `GOOGLE_DRIVE_API_KEY` | — | Optional: Drive folder import |
| `OPENAI_API_KEY` | — | Optional: Whisper auto-transcription |

---

## 8. Git History & Branches

| Commit | What |
|---|---|
| `54ce0c86` | Initial commit: sync server state |
| `790faadb` | VPS baseline: audio updates + backup script |
| `bf908061` | **Phase 1**: template + link-only import/export + audio validation UX |

Current branch: `phase1-template-import-export`
Main branch: `main`

---

## 9. Frontend Build

Frontend lives in `web/`. It is compiled and served as static files by Django.

```bash
# Install deps (from web/)
cd web && yarn install

# Build production assets
yarn build

# Dev server (hot reload)
yarn start
```

Compiled output lands in `label_studio/core/static_build/`.

The `Dockerfile` runs the frontend build during image construction — no manual
step needed when deploying via Docker.

---

## 10. Adding a New Custom Endpoint

1. Create handler in appropriate `label_studio/<app>/` file (e.g. `my_feature.py`).
2. Register URL in that app's `urls.py`.
3. Ensure the app's `urls.py` is included in `label_studio/core/urls.py` (already true for `data_import`, `data_export`).
4. If new DB model: create migration (`python manage.py makemigrations`), commit migration file.

---

## 11. Key Patterns & Conventions

- **`clean_name`** — always use `clean_filename()` from `core/utils/filename.py`. Never store raw Cloudinary URLs as display names.
- **`source_url`** — always store original HTTP URL in `task.data['source_url']`. Export uses this to avoid leaking internal paths.
- **Link-only rule** — media bytes never hit VPS disk. Browser fetches from CDN directly.
- **Fixensy prefix** — all custom JS code inside `view.tsx` uses `// Fixensy:` comment or `FIXENSY_` constant prefix. Makes upstream merges easier.
- **No OPENAI dependency** — all Whisper calls are fire-and-forget; missing key = silent skip. Never crash the UI.
- **Toast errors** — validation errors use `window.LS_TOAST.show({message, type:'error'})`. This is the LS global toast injected by the app shell.

---

## 12. Common Tasks

### Check running containers
```bash
docker compose ps
docker compose logs -f label_studio
```

### Django shell
```bash
docker compose exec label_studio python label_studio/manage.py shell_plus
```

### Run migrations
```bash
docker compose exec label_studio python label_studio/manage.py migrate
```

### Reset admin password
```bash
docker compose exec label_studio python label_studio/manage.py shell -c \
  "from users.models import User; u=User.objects.get(email='info@fixensy.com'); u.set_password('NewPass'); u.save()"
```

### Rebuild image after code change
```bash
docker compose build label_studio
docker compose up -d label_studio
```

---

*Generated 2026-04-29. Update this file when adding new features.*
   # Role-Based Access Control (RBAC) Analysis in Fixensy / Label Studio

Based on a thorough review of the codebase, here is a detailed breakdown of how roles, users, and permissions are handled. Fixensy builds upon the open-source Label Studio foundation, which uses a combination of Django's built-in authentication, a custom organization-member layer, and `django-rules` for API permissions.

## 1. Django User Roles (Global)
**File:** `label_studio/users/models.py`

The base `User` model inherits from Django's `AbstractBaseUser` and `PermissionsMixin`. It includes standard Django global roles:
*   `is_superuser`: Grants full access to the Django admin panel and all underlying data. By default, the account `info@fixensy.com` / `Fixensy01+.owner` is created as a superuser on startup.
*   `is_staff`: Allows a user to log into the backend Django admin site.

## 2. Organization-Level Roles (The Core RBAC)
**File:** `label_studio/organizations/models.py`

Most of the business-logic roles are scoped to an **Organization**. The `OrganizationMember` model links a `User` to an `Organization` and defines their role within that workspace.

There are exactly two distinct roles defined:
```python
ROLE_ADMIN = 'admin'
ROLE_ANNOTATOR = 'annotator'
```

Access checks are performed via properties on the `OrganizationMember` model:
*   `is_owner`: Returns `True` if the user is the original creator of the organization (`self.user.id == self.organization.created_by.id`).
*   `is_admin`: Returns `True` if the user has the `admin` role **OR** if they are the `is_owner`.
*   `is_annotator`: Returns `True` if the user has the `annotator` role **AND** is not the owner.

## 3. The Permissions Engine (`django-rules`)
**File:** `label_studio/core/permissions.py`

Label Studio defines a massive list of granular permission strings (e.g., `projects.create`, `tasks.view`, `annotations.change`, `organizations.invite`). 

However, in this open-source fork architecture, **all granular permissions default to checking if the user is authenticated**:
```python
for _, permission_name in all_permissions:
    make_perm(permission_name, rules.is_authenticated)
```
> [!NOTE]
> Because of this mapping, any authenticated user fundamentally passes the `django-rules` checks. The real security boundaries are enforced by **Object-Level Permissions** (see below).

## 4. API Object-Level Boundaries
**File:** `label_studio/core/api_permissions.py`

Django REST Framework (DRF) views use custom permission classes to ensure users can only access data belonging to their organization:

*   **`HasObjectPermission`**: Calls `obj.has_permission(request.user)` on the target model (Project, Task, etc.). Most models implement `has_permission` to check if the user belongs to the same Organization as the object.
*   **`MemberHasOwnerPermission`**: Enforces that for write operations (POST, PUT, PATCH, DELETE), the user must have an `own_organization` or explicit owner privileges.

## Summary 
The system operates on a relatively flat RBAC model optimized for small-to-medium teams:
1.  **Annotators** can label tasks and view projects within their Organization.
2.  **Admins / Owners** can manage members and settings within their Organization.
3.  **Superusers** (like `info@fixensy.com`) bypass all checks and can manage the entire VPS server instance.
