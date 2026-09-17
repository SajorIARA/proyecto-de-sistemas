from __future__ import annotations

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.models import Usuario
from usuarios.serializers import RegisterSerializer


class ContratoJsonWebTokenTests(TestCase):
    """US-1 (Issue #10) — DoD: generación exitosa de tokens al verificar
    credenciales correctas. Contrato frontend #88 (normalizeTokens acepta el
    shape flat {access, refresh})."""

    def setUp(self) -> None:
        self.cliente = APIClient()
        self.email = "turista@example.com"
        self.password = "demo1234!"
        self.usuario = Usuario.objects.create_user(
            email=self.email,
            password=self.password,
            nombre="Turista Demo",
        )

    def genero_login_payload(self) -> dict:
        return {
            "email": self.email,
            "password": self.password,
        }

    def test_login_con_credenciales_correctas_genera_access_y_refresh(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/login/",
            self.genero_login_payload(),
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        access = respuesta.data.get("access")
        refresh = respuesta.data.get("refresh")
        self.assertTrue(access)
        self.assertTrue(refresh)
        self.assertNotEqual(access, refresh)

    def test_login_con_password_incorrecto_no_genera_tokens(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/login/",
            {"email": self.email, "password": "clave_incorrecta"},
            format="json",
        )
        self.assertIn(respuesta.status_code, (400, 401))
        self.assertNotIn("access", respuesta.data)

    def test_register_crea_usuario_con_hash_y_entrega_tokens(self) -> None:
        serializer = RegisterSerializer(
            data={
                "nombre": "Turista Nuevo",
                "email": "nuevo@example.com",
                "password": "otraclave123!",
                "password_confirm": "otraclave123!",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        usuario, refresh, access = serializer.save()
        self.assertTrue(str(refresh))
        self.assertTrue(str(access))
        creado = Usuario.objects.get(email="nuevo@example.com")
        self.assertNotEqual(creado.password, "otraclave123!")
        self.assertTrue(creado.check_password("otraclave123!"))

    def test_logout_blacklistea_el_refresh(self) -> None:
        refresh = RefreshToken.for_user(self.usuario)
        refresh.blacklist()
        with self.assertRaises(TokenError):
            RefreshToken(refresh).verify()
