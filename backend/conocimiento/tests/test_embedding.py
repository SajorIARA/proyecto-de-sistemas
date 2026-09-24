from __future__ import annotations

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from conocimiento.models import FragmentoDocumental, FuenteDocumental
from usuarios.models import Rol, Usuario


class FragmentoEmbeddingWriteOnlyTests(TestCase):
    """El embedding se acepta en escritura pero no se expone en lectura."""

    def setUp(self) -> None:
        self.cliente = APIClient()
        usuario = Usuario.objects.create_user(
            email="admin_emb@test.com", password="clave1234!", nombre="Admin Emb"
        )
        rol, _ = Rol.objects.get_or_create(
            codigo="ADMIN", defaults={"nombre": "Administrador"}
        )
        usuario.roles.add(rol)
        resp = self.cliente.post(
            "/api/auth/login/",
            {"email": "admin_emb@test.com", "password": "clave1234!"},
            format="json",
        )
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        self.fuente = FuenteDocumental.objects.create(titulo="Fuente Emb", tipo="guia")

    def test_create_acepta_embedding(self) -> None:
        resp = self.cliente.post(
            "/api/conocimiento/fragmentos/",
            {
                "fuente": str(self.fuente.id_fuente),
                "numero_fragmento": 1,
                "contenido": "Texto con vector",
                "embedding": [0.0] * 1536,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_list_no_expone_embedding(self) -> None:
        FragmentoDocumental.objects.create(
            fuente=self.fuente,
            numero_fragmento=0,
            contenido="Texto",
            embedding=[0.1] * 1536,
        )
        resp = self.cliente.get("/api/conocimiento/fragmentos/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotIn("embedding", resp.data["results"][0])

    def test_detalle_no_expone_embedding(self) -> None:
        fragmento = FragmentoDocumental.objects.create(
            fuente=self.fuente,
            numero_fragmento=0,
            contenido="Texto",
            embedding=[0.1] * 1536,
        )
        resp = self.cliente.get(
            f"/api/conocimiento/fragmentos/{fragmento.id_fragmento}/"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotIn("embedding", resp.data)

    def test_create_embedding_dimension_invalida_400(self) -> None:
        resp = self.cliente.post(
            "/api/conocimiento/fragmentos/",
            {
                "fuente": str(self.fuente.id_fuente),
                "numero_fragmento": 2,
                "contenido": "Vector corto",
                "embedding": [0.5, 0.6, 0.7],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_embedding_no_numerico_400(self) -> None:
        resp = self.cliente.post(
            "/api/conocimiento/fragmentos/",
            {
                "fuente": str(self.fuente.id_fuente),
                "numero_fragmento": 3,
                "contenido": "Vector sucio",
                "embedding": ["x"] * 1536,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
