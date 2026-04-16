"""This file and its contents are licensed under the Apache License 2.0.
Please see the included NOTICE for copyright information and LICENSE for a copy of the license.

FixStudio RBAC migration:
  - Adds `role` (owner/admin/reviewer/annotator)
  - Adds `is_suspended`, `suspended_at`, `suspension_reason`
  - Backfills existing memberships:
      * Organization creator   -> 'owner'
      * Everyone else (legacy) -> 'admin'  (so existing users don't lose access)
"""

from django.db import migrations, models


def backfill_roles(apps, schema_editor):
    OrganizationMember = apps.get_model('organizations', 'OrganizationMember')
    db_alias = schema_editor.connection.alias

    for member in OrganizationMember.objects.using(db_alias).select_related('organization', 'organization__created_by').iterator():
        org = member.organization
        if org and org.created_by_id and member.user_id == org.created_by_id:
            member.role = 'owner'
        else:
            # Legacy users keep admin access so we don't accidentally lock anyone out.
            member.role = 'admin'
        member.save(update_fields=['role'])


def reverse_backfill_roles(apps, schema_editor):
    # No-op: removing the column is handled by the schema operation below.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0006_alter_organizationmember_deleted_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='organizationmember',
            name='role',
            field=models.CharField(
                choices=[
                    ('owner', 'Owner'),
                    ('admin', 'Admin'),
                    ('reviewer', 'Reviewer'),
                    ('annotator', 'Annotator'),
                ],
                db_index=True,
                default='annotator',
                help_text='RBAC role within the organization (owner / admin / reviewer / annotator).',
                max_length=32,
                verbose_name='role',
            ),
        ),
        migrations.AddField(
            model_name='organizationmember',
            name='is_suspended',
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text='If True, the member cannot log in or perform any actions.',
                verbose_name='is suspended',
            ),
        ),
        migrations.AddField(
            model_name='organizationmember',
            name='suspended_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='Timestamp when the member was suspended.',
                verbose_name='suspended at',
            ),
        ),
        migrations.AddField(
            model_name='organizationmember',
            name='suspension_reason',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Reason for suspension (visible to admins).',
                verbose_name='suspension reason',
            ),
        ),
        migrations.RunPython(backfill_roles, reverse_backfill_roles),
    ]
