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

    def login_y_obtengo_tokens(self) -> dict:
        respuesta = self.cliente.post(
            "/api/auth/login/",
            self.genero_login_payload(),
            format="json",
        )
        return respuesta.data

    # ── Login ───────────────────────────────────────────────────────────

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

    def test_login_retorna_datos_del_usuario(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/login/",
            self.genero_login_payload(),
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        user = respuesta.data.get("user")
        self.assertIsNotNone(user)
        self.assertEqual(user["email"], self.email)
        self.assertEqual(user["nombre"], "Turista Demo")
        self.assertIn("id", user)
        self.assertIsInstance(user["roles"], list)

    def test_login_sin_campos_obligatorios_retorna_400(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/login/",
            {},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_sin_password_retorna_400(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/login/",
            {"email": self.email},
            format="json",
        )
        self.assertIn(respuesta.status_code, (400, 401))

    # ── Register ────────────────────────────────────────────────────────

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

    def test_register_endpoint_crea_usuario_y_devuelve_tokens(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/register/",
            {
                "nombre": "Turista API",
                "email": "api@example.com",
                "password": "claveapi123!",
                "password_confirm": "claveapi123!",
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", respuesta.data)
        self.assertIn("access", respuesta.data["tokens"])
        self.assertIn("refresh", respuesta.data["tokens"])
        self.assertIn("user", respuesta.data)
        self.assertEqual(respuesta.data["user"]["email"], "api@example.com")
        self.assertTrue(Usuario.objects.filter(email="api@example.com").exists())

    def test_register_email_duplicado_retorna_400(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/register/",
            {
                "nombre": "Duplicado",
                "email": self.email,
                "password": "clave1234!",
                "password_confirm": "clave1234!",
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_passwords_no_coinciden_retorna_400(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/register/",
            {
                "nombre": "Test",
                "email": "test@example.com",
                "password": "clave1234!",
                "password_confirm": "otra_clave!",
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_corto_retorna_400(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/register/",
            {
                "nombre": "Test",
                "email": "corto@example.com",
                "password": "abc",
                "password_confirm": "abc",
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Token Refresh ───────────────────────────────────────────────────

    def test_refresh_token_genera_nuevo_access(self) -> None:
        tokens = self.login_y_obtengo_tokens()
        respuesta = self.cliente.post(
            "/api/auth/token/refresh/",
            {"refresh": tokens["refresh"]},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertIn("access", respuesta.data)
        self.assertTrue(respuesta.data["access"])
        self.assertNotEqual(respuesta.data["access"], tokens["access"])

    def test_refresh_token_invalido_retorna_401(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/token/refresh/",
            {"refresh": "token_inexistente"},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_sin_body_retorna_400(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/token/refresh/",
            {},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Logout ──────────────────────────────────────────────────────────

    def test_logout_endpoint_blacklistea_el_refresh(self) -> None:
        tokens = self.login_y_obtengo_tokens()
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        respuesta = self.cliente.post(
            "/api/auth/logout/",
            {"refresh": tokens["refresh"]},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_204_NO_CONTENT)
        with self.assertRaises(TokenError):
            RefreshToken(tokens["refresh"]).verify()

    def test_logout_refresh_invalido_retorna_401(self) -> None:
        tokens = self.login_y_obtengo_tokens()
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        respuesta = self.cliente.post(
            "/api/auth/logout/",
            {"refresh": "token_inexistente"},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_sin_auth_retorna_401(self) -> None:
        tokens = self.login_y_obtengo_tokens()
        respuesta = self.cliente.post(
            "/api/auth/logout/",
            {"refresh": tokens["refresh"]},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_luego_refresh_falla(self) -> None:
        tokens = self.login_y_obtengo_tokens()
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.cliente.post(
            "/api/auth/logout/",
            {"refresh": tokens["refresh"]},
            format="json",
        )
        respuesta = self.cliente.post(
            "/api/auth/token/refresh/",
            {"refresh": tokens["refresh"]},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Asignación de rol por defecto (Issue #9) ────────────────────────

    def test_register_asigna_rol_tourist_por_defecto(self) -> None:
        serializer = RegisterSerializer(
            data={
                "nombre": "Nuevo Turista",
                "email": "nuevoturista@example.com",
                "password": "clave1234!",
                "password_confirm": "clave1234!",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        usuario, _, _ = serializer.save()
        self.assertTrue(
            usuario.roles.filter(codigo="TOURIST").exists(),
            "El usuario nuevo debería tener el rol TOURIST",
        )

    def test_register_endpoint_retorna_roles_asignados(self) -> None:
        respuesta = self.cliente.post(
            "/api/auth/register/",
            {
                "nombre": "Turista Roles",
                "email": "roles@example.com",
                "password": "claveapi123!",
                "password_confirm": "claveapi123!",
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        roles = respuesta.data["user"]["roles"]
        self.assertIn("TOURIST", roles)

    def test_register_usuario_tiene_solo_un_rol(self) -> None:
        serializer = RegisterSerializer(
            data={
                "nombre": "Solo Un Rol",
                "email": "unrol@example.com",
                "password": "clave1234!",
                "password_confirm": "clave1234!",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        usuario, _, _ = serializer.save()
        self.assertEqual(usuario.roles.count(), 1)
        self.assertEqual(usuario.roles.first().codigo, "TOURIST")

    def test_register_login_muestra_rol_tourist(self) -> None:
        self.cliente.post(
            "/api/auth/register/",
            {
                "nombre": "Login Tourist",
                "email": "logintourist@example.com",
                "password": "clave1234!",
                "password_confirm": "clave1234!",
            },
            format="json",
        )
        respuesta = self.cliente.post(
            "/api/auth/login/",
            {"email": "logintourist@example.com", "password": "clave1234!"},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertIn("TOURIST", respuesta.data["user"]["roles"])
