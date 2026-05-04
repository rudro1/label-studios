import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.label_studio')
django.setup()

print(f"BASE_DATA_DIR: {settings.BASE_DATA_DIR}")
print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
print(f"DATABASE NAME: {settings.DATABASES['default']['NAME']}")
