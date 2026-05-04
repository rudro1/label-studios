from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0062_taskassignment'),
    ]

    operations = [
        migrations.AddField(
            model_name='taskassignment',
            name='rejection_reason',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='taskassignment',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending_annotation', 'Pending Annotation'),
                    ('pending_review', 'Pending Review'),
                    ('completed', 'Completed'),
                    ('rejected', 'Rejected'),
                ],
                db_index=True,
                default='pending_annotation',
                max_length=50,
            ),
        ),
        migrations.AddIndex(
            model_name='taskassignment',
            index=models.Index(fields=['annotator', 'status'], name='tasks_taska_annotat_aa1889_idx'),
        ),
        migrations.AddIndex(
            model_name='taskassignment',
            index=models.Index(fields=['reviewer', 'status'], name='tasks_taska_reviewe_eceedc_idx'),
        ),
    ]
