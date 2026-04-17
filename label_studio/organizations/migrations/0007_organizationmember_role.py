"""Fixensy: Add role field to OrganizationMember"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0006_alter_organizationmember_deleted_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizationmember",
            name="role",
            field=models.CharField(
                choices=[("admin", "Admin"), ("annotator", "Annotator")],
                default="annotator",
                help_text="Role of the member in the organization",
                max_length=20,
            ),
        ),
    ]
