#!/usr/bin/env python3
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.label_studio')
django.setup()

from users.models import User

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'info@fixensy.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Fixensy01+')

user, created = User.objects.update_or_create(
    email=ADMIN_EMAIL,
    defaults={
        'is_superuser': True,
        'is_staff': True,
        'is_active': True,
        'username': ADMIN_EMAIL,
    }
)
user.set_password(ADMIN_PASSWORD)
user.save()

print(f"Admin user ensured: {ADMIN_EMAIL} (created={created})")
