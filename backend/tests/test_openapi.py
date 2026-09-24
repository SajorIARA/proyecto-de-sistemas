from __future__ import annotations

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class OpenAPITests(TestCase):
    """El contrato OpenAPI se sirve y cubre los endpoints clave."""

    def setUp(self) -> None:
        self.cliente = APIClient()

    def test_schema_json_200_con_paths_clave(self) -> None:
        resp = self.cliente.get("/api/schema/", HTTP_ACCEPT="application/json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rutas = resp.data["paths"].keys()
        for esperada in (
            "/api/auth/login/",
            "/api/auth/register/",
            "/api/auth/password/change/",
            "/api/turismo/atractivos/",
            "/api/turismo/atractivos/cercanos/",
            "/api/conocimiento/fragmentos/",
            "/api/recomendaciones/consultas/",
        ):
            self.assertIn(esperada, rutas)

    def test_swagger_ui_200(self) -> None:
        resp = self.cliente.get("/api/docs/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_redoc_200(self) -> None:
        resp = self.cliente.get("/api/redoc/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
