import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.label_studio")
django.setup()

from django.conf import settings
print(f"DATABASE PATH: {settings.DATABASES['default'].get('NAME')}")
print(f"DATABASE ENGINE: {settings.DATABASES['default'].get('ENGINE')}")

from users.models import User
from organizations.models import Organization
from projects.models import Project
from tasks.models import Task, Annotation
from django.core.files.base import ContentFile
import json

# 1. Super Admin is provisioned exclusively via `python manage.py create_super_admin`
#    using FIXENSY_SUPERADMIN_EMAIL / FIXENSY_SUPERADMIN_PASSWORD env vars.
#    No super admin credentials live in source — Master Prompt rule 3 (Super Admin Secrecy).
super_admin = User.objects.filter(is_superuser=True).order_by('id').first()

# 2. Create Admin (Organization Owner)
admin_user, created = User.objects.get_or_create(
    email='admin@fixensy.com',
    defaults={'is_superuser': False, 'first_name': 'Fixensy', 'last_name': 'Admin'}
)
if created:
    admin_user.set_password('fixensy123')
    admin_user.save()
    
    # Also create their organization
    org = Organization.create_organization(created_by=admin_user, title='Fixensy Organization')
    admin_user.active_organization = org
    admin_user.save()
    print("Created Admin: admin@fixensy.com")
else:
    org = admin_user.active_organization

# Keep Super Admin outside tenant organizations.
if super_admin and not super_admin.active_organization_id:
    control_org = Organization.objects.filter(created_by=super_admin).first()
    if control_org:
        super_admin.active_organization = control_org
        super_admin.save(update_fields=['active_organization'])

# 3. Create Annotator and Reviewer
annotator, created = User.objects.get_or_create(
    email='annotator@fixensy.com',
    defaults={'first_name': 'Task', 'last_name': 'Annotator'}
)
if created:
    annotator.set_password('fixensy123')
    annotator.active_organization = org
    annotator.save()
    org.add_user(annotator)
    # They default to Annotator role
    print("Created Annotator: annotator@fixensy.com")

reviewer, created = User.objects.get_or_create(
    email='reviewer@fixensy.com',
    defaults={'first_name': 'Task', 'last_name': 'Reviewer'}
)
if created:
    reviewer.set_password('fixensy123')
    reviewer.active_organization = org
    reviewer.save()
    member = org.add_user(reviewer)
    member.role = 'reviewer' # Reviewer Role
    member.save()
    print("Created Reviewer: reviewer@fixensy.com")

import yaml

# 4. Create a Project
config_path = os.path.join(
    os.path.dirname(settings.BASE_DIR),
    'annotation_templates',
    'fixensy',
    'audio-labeling',
    'config.yml',
)
with open(config_path, 'r') as f:
    template_data = yaml.safe_load(f)
    label_config = template_data.get('config', '')

project, p_created = Project.objects.get_or_create(
    title='Fixensy Test Project',
    organization=org,
    created_by=admin_user,
    defaults={
        'label_config': label_config
    }
)
if p_created:
    print("Created Project: Fixensy Test Project")
    
    # 5. Create some tasks
    Task.objects.create(project=project, data={'url': 'https://htx-pub.s3.us-east-1.amazonaws.com/examples/audio/barradeen-emotional.mp3'}, overlap=1)
    Task.objects.create(project=project, data={'url': 'https://htx-pub.s3.us-east-1.amazonaws.com/examples/audio/1.wav'}, overlap=1)
    print("Added 2 Audio Tasks.")
    
print("Test Data Setup Complete!")
print("Test users (password 'fixensy123'):")
print("- Admin: admin@fixensy.com")
print("- Annotator: annotator@fixensy.com")
print("- Reviewer: reviewer@fixensy.com")
print("Super Admin: provision via `python manage.py create_super_admin` using env vars.")
