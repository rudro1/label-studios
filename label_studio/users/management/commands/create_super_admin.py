"""Create or rotate the Fixensy Super Admin credential.

Reads FIXENSY_SUPERADMIN_EMAIL and FIXENSY_SUPERADMIN_PASSWORD from the environment.
Never accept credentials as CLI args — keeps them out of shell history and process lists.
Idempotent: re-running with the same email rotates the password and ensures is_superuser=True.
"""

import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from organizations.models import Organization, OrganizationMember
from users.models import User


class Command(BaseCommand):
    help = 'Create or rotate the Fixensy Super Admin from env vars.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--purge-default',
            action='store_true',
            help='Delete the legacy superadmin@fixensy.com test account if present.',
        )

    def handle(self, *args, **options):
        email = (os.environ.get('FIXENSY_SUPERADMIN_EMAIL') or '').strip().lower()
        password = os.environ.get('FIXENSY_SUPERADMIN_PASSWORD') or ''

        if not email or '@' not in email:
            raise CommandError('FIXENSY_SUPERADMIN_EMAIL is missing or invalid.')
        if len(password) < 12:
            raise CommandError('FIXENSY_SUPERADMIN_PASSWORD must be at least 12 characters.')

        with transaction.atomic():
            user, created = User.objects.get_or_create(
                email=email,
                defaults={'username': email, 'is_superuser': True, 'is_staff': True},
            )
            if not user.is_superuser or not user.is_staff:
                user.is_superuser = True
                user.is_staff = True
            user.set_password(password)
            user.save()

            if not user.active_organization_id:
                org = Organization.objects.filter(created_by=user).first()
                if not org:
                    org = Organization.create_organization(created_by=user, title='Fixensy Control')
                user.active_organization = org
                user.save(update_fields=['active_organization'])
                if not OrganizationMember.objects.filter(user=user, organization=org).exists():
                    org.add_user(user)

            if options.get('purge_default'):
                legacy = User.objects.filter(email='superadmin@fixensy.com').exclude(pk=user.pk)
                purged = legacy.count()
                legacy.delete()
            else:
                purged = 0

        action = 'created' if created else 'rotated'
        self.stdout.write(self.style.SUCCESS(f'Super Admin {action} for {email}.'))
        if purged:
            self.stdout.write(self.style.WARNING(f'Removed {purged} legacy superadmin@fixensy.com record(s).'))
