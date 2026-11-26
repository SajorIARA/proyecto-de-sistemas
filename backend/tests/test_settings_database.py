"""Regresión: ``DATABASE_URL`` debe conservar el backend PostGIS.

Django descubre pruebas con ``manage.py test``, por lo que la prueba se
declara como ``SimpleTestCase`` (no necesita base de datos) en lugar de una
función suelta de pytest.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase

BASE_DIR = Path(__file__).resolve().parent.parent


class DatabaseUrlSettingsTests(SimpleTestCase):
    def test_preserves_postgis_engine_and_ssl(self) -> None:
        env = os.environ.copy()
        env.update(
            {
                "DJANGO_SETTINGS_MODULE": "config.settings",
                "DJANGO_SECRET_KEY": "test-secret",
                "DJANGO_DEBUG": "0",
                "DATABASE_URL": ("postgresql://user:pass@db.example.com:5432/postgres"),
                "DB_SSL_REQUIRE": "1",
            }
        )
        code = (
            "from django.conf import settings;"
            "db = settings.DATABASES['default'];"
            "print(db['ENGINE']);"
            "print(db.get('OPTIONS', {}).get('sslmode', ''))"
        )
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=BASE_DIR,
            env=env,
            capture_output=True,
            text=True,
            check=True,
        )

        lines = result.stdout.strip().splitlines()
        self.assertEqual(lines[0], "django.contrib.gis.db.backends.postgis")
        self.assertEqual(lines[1], "require")
