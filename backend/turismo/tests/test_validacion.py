from __future__ import annotations

from django.contrib.gis.geos import Point
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from turismo.models import Atractivo, TipoTarifa
from usuarios.models import Rol, Usuario


class TarifaValidacionTests(TestCase):
    """El CHECK ck_tarifa_monto (>= 0) se replica en el serializer."""

    def setUp(self) -> None:
        self.cliente = APIClient()
        usuario = Usuario.objects.create_user(
            email="admin_tar@test.com", password="clave1234!", nombre="Admin Tar"
        )
        rol, _ = Rol.objects.get_or_create(
            codigo="ADMIN", defaults={"nombre": "Administrador"}
        )
        usuario.roles.add(rol)
        resp = self.cliente.post(
            "/api/auth/login/",
            {"email": "admin_tar@test.com", "password": "clave1234!"},
            format="json",
        )
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        self.atractivo = Atractivo.objects.create(
            nombre="Tarifa Test",
            descripcion="Atractivo",
            ubicacion=Point(-68.1486, -16.4966, srid=4326),
        )
        self.tipo = TipoTarifa.objects.create(codigo="TV", nombre="Validacion")

    def test_tarifa_monto_negativo_400(self) -> None:
        resp = self.cliente.post(
            "/api/turismo/tarifas/",
            {
                "atractivo": str(self.atractivo.id_atractivo),
                "tipo_tarifa": self.tipo.id_tipo_tarifa,
                "monto": "-5.00",
                "moneda": "BOB",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_tarifa_monto_cero_ok(self) -> None:
        resp = self.cliente.post(
            "/api/turismo/tarifas/",
            {
                "atractivo": str(self.atractivo.id_atractivo),
                "tipo_tarifa": self.tipo.id_tipo_tarifa,
                "monto": "0.00",
                "moneda": "BOB",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
