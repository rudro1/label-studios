# Generated manually for Fixensy backward compatibility.

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0064_taskassignment_completed_at_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="annotation",
            name="parent_reviewer",
            field=models.ForeignKey(
                blank=True,
                help_text="Legacy reviewer linkage kept for backward-compatible review workflow rows.",
                null=True,
                on_delete=models.SET_NULL,
                related_name="reviewed_child_annotations",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="annotation",
            name="reject_reason",
            field=models.TextField(
                blank=True,
                default=None,
                help_text="Legacy per-annotation reject reason kept for backward-compatible review workflow rows.",
                null=True,
                verbose_name="reject reason",
            ),
        ),
        migrations.AddField(
            model_name="annotation",
            name="review_state",
            field=models.CharField(
                default="pending",
                help_text="Legacy per-annotation review state kept for backward-compatible workflow rows.",
                max_length=20,
                verbose_name="review state",
            ),
        ),
    ]
