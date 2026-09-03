from django.conf import settings
from django.db import connection
from django.test import SimpleTestCase, TestCase


class BaseConfigurationTests(SimpleTestCase):
    def test_postgresql_is_configured(self):
        database = settings.DATABASES["default"]

        self.assertEqual(database["ENGINE"], "django.db.backends.postgresql")
        self.assertTrue(database["NAME"])
        self.assertTrue(database["USER"])
        self.assertTrue(database["PASSWORD"])
        self.assertEqual(database["HOST"], "db")
        self.assertEqual(database["PORT"], "5432")

    def test_no_application_routes_are_registered(self):
        response = self.client.get("/nonexistent-base-route/")

        self.assertEqual(response.status_code, 404)


class PostgreSQLConnectionTests(TestCase):
    def test_database_connection_is_available(self):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            self.assertEqual(cursor.fetchone()[0], 1)