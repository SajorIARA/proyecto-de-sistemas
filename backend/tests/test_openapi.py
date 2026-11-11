from __future__ import annotations

import re

from django.test import TestCase
from django.urls import resolve
from rest_framework import status
from rest_framework.test import APIClient


class OpenAPITests(TestCase):
    """El contrato OpenAPI cubre y describe correctamente toda la API."""

    RUTAS_ESPERADAS = {
        "/api/",
        "/api/health/",
        "/api/auth/login/",
        "/api/auth/logout/",
        "/api/auth/password/change/",
        "/api/auth/register/",
        "/api/auth/token/refresh/",
        "/api/auth/usuarios/",
        "/api/conocimiento/fragmentos/",
        "/api/conocimiento/fragmentos/{id_fragmento}/",
        "/api/conocimiento/fuentes/",
        "/api/conocimiento/fuentes/{id_fuente}/",
        "/api/preferences/",
        "/api/preferences/{id}/",
        "/api/recomendaciones/consultas/",
        "/api/recomendaciones/consultas/{id}/",
        "/api/recomendaciones/preferencias/",
        "/api/recomendaciones/preferencias/{id}/",
        "/api/recomendaciones/recomendar/",
        "/api/recommendations/",
        "/api/turismo/admin/atractivos/",
        "/api/turismo/admin/atractivos/{id_atractivo}/",
        "/api/turismo/admin/fotos/",
        "/api/turismo/admin/fotos/firma/",
        "/api/turismo/admin/fotos/subir/",
        "/api/turismo/admin/fotos/{id_foto}/",
        "/api/turismo/admin/fotos/{id}/estado/",
        "/api/turismo/atractivos/",
        "/api/turismo/atractivos/cercanos/",
        "/api/turismo/atractivos/facetas/",
        "/api/turismo/atractivos/{id}/",
        "/api/turismo/categorias/",
        "/api/turismo/categorias/{id_categoria}/",
        "/api/turismo/horarios/",
        "/api/turismo/horarios/{id_horario}/",
        "/api/turismo/tarifas/",
        "/api/turismo/tarifas/{id_tarifa}/",
        "/api/turismo/tipos-tarifa/",
        "/api/turismo/tipos-tarifa/{id_tipo_tarifa}/",
    }
    OPERACIONES_PUBLICAS = {
        ("get", "/api/"),
        ("get", "/api/health/"),
        ("post", "/api/auth/login/"),
        ("post", "/api/auth/register/"),
        ("post", "/api/auth/token/refresh/"),
        ("get", "/api/conocimiento/fragmentos/"),
        ("get", "/api/conocimiento/fragmentos/{id_fragmento}/"),
        ("get", "/api/conocimiento/fuentes/"),
        ("get", "/api/conocimiento/fuentes/{id_fuente}/"),
        ("get", "/api/turismo/atractivos/"),
        ("get", "/api/turismo/atractivos/cercanos/"),
        ("get", "/api/turismo/atractivos/facetas/"),
        ("get", "/api/turismo/atractivos/{id}/"),
        ("get", "/api/turismo/categorias/"),
        ("get", "/api/turismo/categorias/{id_categoria}/"),
        ("get", "/api/turismo/horarios/"),
        ("get", "/api/turismo/horarios/{id_horario}/"),
        ("get", "/api/turismo/tarifas/"),
        ("get", "/api/turismo/tarifas/{id_tarifa}/"),
        ("get", "/api/turismo/tipos-tarifa/"),
        ("get", "/api/turismo/tipos-tarifa/{id_tipo_tarifa}/"),
    }
    METODOS_OPENAPI = {"get", "post", "put", "patch", "delete"}

    def setUp(self) -> None:
        self.cliente = APIClient()
        respuesta = self.cliente.get("/api/schema/", HTTP_ACCEPT="application/json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.esquema = respuesta.data

    def test_schema_cubre_todas_las_rutas_y_operaciones(self) -> None:
        rutas = self.esquema["paths"]
        self.assertEqual(set(rutas), self.RUTAS_ESPERADAS)
        operaciones = [
            operacion
            for item in rutas.values()
            for metodo, operacion in item.items()
            if metodo in self.METODOS_OPENAPI
        ]
        self.assertEqual(len(operaciones), 82)
        ids = [operacion["operationId"] for operacion in operaciones]
        self.assertEqual(len(ids), len(set(ids)))

    def test_todas_las_rutas_documentadas_resuelven_en_django(self) -> None:
        for ruta in self.esquema["paths"]:
            concreta = re.sub(r"\{[^}]+\}", "1", ruta)
            with self.subTest(ruta=ruta):
                self.assertIsNotNone(resolve(concreta).func)

    def test_seguridad_jwt_coincide_con_permisos_reales(self) -> None:
        esquemas = self.esquema["components"]["securitySchemes"]
        self.assertEqual(
            esquemas["jwtAuth"],
            {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"},
        )
        for ruta, item in self.esquema["paths"].items():
            for metodo, operacion in item.items():
                if metodo not in self.METODOS_OPENAPI:
                    continue
                with self.subTest(metodo=metodo, ruta=ruta):
                    if (metodo, ruta) in self.OPERACIONES_PUBLICAS:
                        self.assertFalse(operacion.get("security"))
                    else:
                        self.assertEqual(operacion.get("security"), [{"jwtAuth": []}])

    def test_swagger_ui_carga_recursos_fijados_y_opciones_utiles(self) -> None:
        respuesta = self.cliente.get("/api/docs/")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        html = respuesta.content.decode()
        self.assertIn("swagger-ui-dist@5.34.1", html)
        self.assertIn('"deepLinking": false', html)
        self.assertIn('"displayRequestDuration": true', html)
        self.assertIn('"filter": true', html)
        self.assertIn('"persistAuthorization": true', html)
        self.assertNotIn("swagger-ui-dist@latest", html)

    def test_redoc_carga_version_fijada(self) -> None:
        respuesta = self.cliente.get("/api/redoc/")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        html = respuesta.content.decode()
        self.assertIn("redoc@3.1.0", html)
        self.assertNotIn("redoc@latest", html)
