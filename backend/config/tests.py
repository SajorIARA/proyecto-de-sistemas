import os

from django.conf import settings
from django.db import connection
from django.test import SimpleTestCase, TestCase


class BaseConfigurationTests(SimpleTestCase):
    def test_postgresql_is_configured(self):
        database = settings.DATABASES["default"]

        self.assertEqual(database["ENGINE"], "django.contrib.gis.db.backends.postgis")
        self.assertTrue(database["NAME"])
        self.assertTrue(database["USER"])
        self.assertTrue(database["PASSWORD"])
        self.assertEqual(database["HOST"], os.getenv("POSTGRES_HOST", "db"))
        self.assertEqual(database["PORT"], "5432")

    def test_health_endpoint_returns_ok(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_unknown_route_returns_404(self):
        response = self.client.get("/nonexistent-base-route/")

        self.assertEqual(response.status_code, 404)


class ProductionSecurityDefaultsTests(SimpleTestCase):
    def test_secure_settings_are_enforced_without_debug(self):
        if os.getenv("DJANGO_DEBUG", "0") == "1":
            self.skipTest("DEBUG activo: el hardening de producción no se aplica")
        self.assertEqual(settings.SESSION_COOKIE_SECURE, True)
        self.assertEqual(settings.CSRF_COOKIE_SECURE, True)
        self.assertEqual(settings.SECURE_CONTENT_TYPE_NOSNIFF, True)
        self.assertEqual(settings.X_FRAME_OPTIONS, "DENY")
        self.assertEqual(settings.SECURE_HSTS_SECONDS, 31536000)


class PostgreSQLConnectionTests(TestCase):
    def test_database_connection_is_available(self):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            self.assertEqual(cursor.fetchone()[0], 1)
