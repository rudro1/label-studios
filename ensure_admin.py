"""
ensure_admin.py
---------------
Guaranteed admin creation / password-reset script.
Run this after every deploy inside the app container:

    docker exec <app_container> \
        sh -c "cd /label-studio && .venv/bin/python label_studio/manage.py shell < /ensure_admin.py"

Environment variables used (all optional — hard-coded defaults are below):
    LABEL_STUDIO_USERNAME   admin email
    LABEL_STUDIO_PASSWORD   admin password
"""

import os
import django

# ── settings ────────────────────────────────────────────────────────────────
ADMIN_EMAIL    = os.environ.get("LABEL_STUDIO_USERNAME", "info@fixensy.com")
ADMIN_PASSWORD = os.environ.get("LABEL_STUDIO_PASSWORD", "Fixensy01+")
# ────────────────────────────────────────────────────────────────────────────

from users.models import User
from organizations.models import Organization

print(f"[ensure_admin] target email : {ADMIN_EMAIL}")

# ── 1. create or update the admin user ──────────────────────────────────────
user = User.objects.filter(email=ADMIN_EMAIL).first()

if user is None:
    user = User.objects.create_superuser(email=ADMIN_EMAIL, password=ADMIN_PASSWORD)
    print("[ensure_admin] ✓ admin user CREATED")
else:
    user.set_password(ADMIN_PASSWORD)
    user.is_staff     = True
    user.is_superuser = True
    user.is_active    = True
    user.save(update_fields=["password", "is_staff", "is_superuser", "is_active"])
    print("[ensure_admin] ✓ admin user UPDATED (password + flags reset)")

# ── 2. make sure an organisation exists ─────────────────────────────────────
org = Organization.objects.first()

if org is None:
    org = Organization.objects.create(title="Label Studio", created_by=user)
    print("[ensure_admin] ✓ default organisation CREATED")
else:
    print(f"[ensure_admin] ✓ organisation found : {org.title} (id={org.pk})")

# ── 3. ensure the admin belongs to the organisation ─────────────────────────
if not org.has_user(user):
    org.add_user(user)
    print("[ensure_admin] ✓ admin added to organisation")
else:
    print("[ensure_admin] ✓ admin already member of organisation")

# ── 4. set active organisation on the user record ───────────────────────────
if user.active_organization_id != org.pk:
    user.active_organization = org
    user.save(update_fields=["active_organization"])
    print("[ensure_admin] ✓ active_organization set")

# ── 5. final confirmation ────────────────────────────────────────────────────
print(f"[ensure_admin] ─────────────────────────────────────────────────────")
print(f"[ensure_admin]  email    : {user.email}")
print(f"[ensure_admin]  org      : {org.title} (id={org.pk})")
print(f"[ensure_admin]  is_staff : {user.is_staff}")
print(f"[ensure_admin]  is_super : {user.is_superuser}")
print(f"[ensure_admin]  active   : {user.is_active}")
print(f"[ensure_admin] ─────────────────────────────────────────────────────")
print(f"[ensure_admin] DONE — login with {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
