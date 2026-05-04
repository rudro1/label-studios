import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.label_studio')
django.setup()

from users.models import User
from organizations.models import Organization, OrganizationMember

def fix_user_and_org():
    email = 'info@fixensy.com'
    password = 'Fixensy01+.owner'
    org_name = 'FixStudio'

    # 1. Create or update user
    user = User.objects.filter(email=email).first()
    if not user:
        print(f"Creating user {email}...")
        user = User.objects.create_superuser(email=email, password=password)
    else:
        print(f"Updating user {email}...")
        user.set_password(password)
        user.is_superuser = True
        user.is_staff = True
        user.save()

    # 2. Create or update organization
    org = Organization.objects.filter(title=org_name).first()
    if not org:
        print(f"Creating organization {org_name}...")
        org = Organization.objects.create(title=org_name, created_by=user)
    
    # 3. Ensure membership
    if not OrganizationMember.objects.filter(user=user, organization=org).exists():
        print(f"Adding user {email} to organization {org_name}...")
        OrganizationMember.objects.create(user=user, organization=org)
    
    # 4. Set active organization for user
    if user.active_organization != org:
        user.active_organization = org
        user.save()

    print("Fix completed successfully!")

if __name__ == '__main__':
    fix_user_and_org()
