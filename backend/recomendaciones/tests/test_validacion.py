from __future__ import annotations

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from turismo.models import Categoria
from usuarios.models import Rol, Usuario


class RecomendacionesValidacionTests(TestCase):
    """Los CHECK de BD se replican en serializers: 400, nunca 500."""

    def setUp(self) -> None:
        self.cliente = APIClient()
        self.usuario = Usuario.objects.create_user(
            email="admin_val@test.com", password="clave1234!", nombre="Admin Val"
        )
        rol, _ = Rol.objects.get_or_create(
            codigo="ADMIN", defaults={"nombre": "Administrador"}
        )
        self.usuario.roles.add(rol)
        resp = self.cliente.post(
            "/api/auth/login/",
            {"email": "admin_val@test.com", "password": "clave1234!"},
            format="json",
        )
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        self.categoria = Categoria.objects.create(nombre="Validacion")

    def _preferencia(self, **extras) -> dict:
        data = {
            "usuario": str(self.usuario.id_usuario),
            "categoria": self.categoria.id_categoria,
            "nivel_interes": "0.80",
        }
        data.update(extras)
        return data

    def test_preferencia_nivel_ok(self) -> None:
        resp = self.cliente.post(
            "/api/recomendaciones/preferencias/", self._preferencia(), format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_preferencia_nivel_fuera_de_rango_400(self) -> None:
        for nivel in ("-0.10", "1.50", "5"):
            resp = self.cliente.post(
                "/api/recomendaciones/preferencias/",
                self._preferencia(nivel_interes=nivel),
                format="json",
            )
            self.assertEqual(
                resp.status_code, status.HTTP_400_BAD_REQUEST, f"nivel={nivel}"
            )

    def _consulta(self, **extras) -> dict:
        data = {
            "usuario": str(self.usuario.id_usuario),
            "presupuesto_bob": "150.00",
            "tiempo_horas": "4.00",
            "punto_partida": {"coordinates": [-68.1486, -16.4966]},
            "macrodistrito": "Centro",
        }
        data.update(extras)
        return data

    def test_consulta_presupuesto_negativo_400(self) -> None:
        resp = self.cliente.post(
            "/api/recomendaciones/consultas/",
            self._consulta(presupuesto_bob="-10.00"),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_consulta_tiempo_no_positivo_400(self) -> None:
        for tiempo in ("0.00", "-2.00"):
            resp = self.cliente.post(
                "/api/recomendaciones/consultas/",
                self._consulta(tiempo_horas=tiempo),
                format="json",
            )
            self.assertEqual(
                resp.status_code, status.HTTP_400_BAD_REQUEST, f"tiempo={tiempo}"
            )
