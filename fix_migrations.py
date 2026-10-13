"""
One-off script to mark orders.0001_initial as applied in the django_migrations
table so that the InconsistentMigrationHistory error is resolved.

This is safe because the orders tables are about to be created by migrate --run-syncdb
or by the subsequent migrate command after this fake record is in place.
"""
import os
import sys

sys.path.insert(0, "src/commerce")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "commerce.settings")

import django
django.setup()

from django.db import connection
from django.utils import timezone

apps_to_fake = [
    ("orders", "0001_initial"),
]

with connection.cursor() as cursor:
    for app, name in apps_to_fake:
        # Check if already recorded
        cursor.execute(
            "SELECT COUNT(*) FROM django_migrations WHERE app=%s AND name=%s",
            [app, name],
        )
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute(
                "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                [app, name, timezone.now()],
            )
            print(f"Inserted fake migration record: {app}.{name}")
        else:
            print(f"Already exists: {app}.{name} — skipped")

print("Done.")
