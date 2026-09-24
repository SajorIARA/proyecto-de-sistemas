from __future__ import annotations

from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from usuarios.models import Rol, Usuario
from usuarios.throttles import AuthRateThrottle


def _crear_usuario(email: str, codigo_rol: str, *, activo: bool = True) -> Usuario:
    usuario = Usuario.objects.create_user(
        email=email, password="clave1234!", nombre=f"User {codigo_rol}"
    )
    rol, _ = Rol.objects.get_or_create(
        codigo=codigo_rol,
        defaults={"nombre": codigo_rol, "descripcion": f"Rol {codigo_rol}"},
    )
    usuario.roles.add(rol)
    if not activo:
        usuario.activo = False
        usuario.save(update_fields=["activo"])
    return usuario


def _login(cliente: APIClient, email: str) -> dict:
    resp = cliente.post(
        "/api/auth/login/",
        {"email": email, "password": "clave1234!"},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    return resp.data


class HasPermDelegacionRBACTests(TestCase):
    """has_perm/has_module_perms delegan al RBAC por roles."""

    def setUp(self) -> None:
        self.admin = _crear_usuario("hard_admin@test.com", "ADMIN")
        self.turista = _crear_usuario("hard_turista@test.com", "TOURIST")
        self.admin_inactivo = _crear_usuario(
            "hard_inactivo@test.com", "ADMIN", activo=False
        )

    def test_admin_tiene_todos_los_permisos(self) -> None:
        self.assertTrue(self.admin.has_perm("turismo.change_atractivo"))
        self.assertTrue(self.admin.has_module_perms("turismo"))
        self.assertTrue(self.admin.is_staff)
        self.assertTrue(self.admin.is_superuser)

    def test_turista_sin_permisos_django(self) -> None:
        self.assertFalse(self.turista.has_perm("turismo.change_atractivo"))
        self.assertFalse(self.turista.has_module_perms("turismo"))
        self.assertFalse(self.turista.is_staff)
        self.assertFalse(self.turista.is_superuser)

    def test_admin_inactivo_sin_permisos(self) -> None:
        self.assertFalse(self.admin_inactivo.has_perm("turismo.view_atractivo"))
        self.assertFalse(self.admin_inactivo.has_module_perms("turismo"))
        self.assertFalse(self.admin_inactivo.is_staff)


class PasswordChangeTests(TestCase):
    """POST /api/auth/password/change/."""

    URL = "/api/auth/password/change/"

    def setUp(self) -> None:
        self.cliente = APIClient()
        _crear_usuario("cambio@test.com", "TOURIST")
        tokens = _login(self.cliente, "cambio@test.com")
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_anonimo_rechazado(self) -> None:
        resp = APIClient().post(self.URL, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cambio_exitoso_permite_login_nuevo(self) -> None:
        resp = self.cliente.post(
            self.URL,
            {
                "current_password": "clave1234!",
                "new_password": "nuevaClave99!",
                "new_password_confirm": "nuevaClave99!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        anonimo = APIClient()
        vieja = anonimo.post(
            "/api/auth/login/",
            {"email": "cambio@test.com", "password": "clave1234!"},
            format="json",
        )
        self.assertIn(
            vieja.status_code,
            (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED),
        )
        nueva = anonimo.post(
            "/api/auth/login/",
            {"email": "cambio@test.com", "password": "nuevaClave99!"},
            format="json",
        )
        self.assertEqual(nueva.status_code, status.HTTP_200_OK)

    def test_actual_incorrecta_retorna_400(self) -> None:
        resp = self.cliente.post(
            self.URL,
            {
                "current_password": "otra1234!",
                "new_password": "nuevaClave99!",
                "new_password_confirm": "nuevaClave99!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirmacion_distinta_retorna_400(self) -> None:
        resp = self.cliente.post(
            self.URL,
            {
                "current_password": "clave1234!",
                "new_password": "nuevaClave99!",
                "new_password_confirm": "distinta00!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nueva_corta_retorna_400(self) -> None:
        resp = self.cliente.post(
            self.URL,
            {
                "current_password": "clave1234!",
                "new_password": "corta",
                "new_password_confirm": "corta",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nueva_comun_retorna_400(self) -> None:
        resp = self.cliente.post(
            self.URL,
            {
                "current_password": "clave1234!",
                "new_password": "password123",
                "new_password_confirm": "password123",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordValidatorsTests(TestCase):
    """AUTH_PASSWORD_VALIDATORS se aplican en registro."""

    def test_registro_password_comun_retorna_400(self) -> None:
        resp = APIClient().post(
            "/api/auth/register/",
            {
                "nombre": "Comun",
                "email": "comun@test.com",
                "password": "password123",
                "password_confirm": "password123",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(DISABLE_AUTH_THROTTLE=False)
class AuthThrottleTests(TestCase):
    """El throttle de auth limita intentos repetidos por IP."""

    def setUp(self) -> None:
        cache.clear()
        self.cliente = APIClient()
        _crear_usuario("throttle@test.com", "TOURIST")

    def tearDown(self) -> None:
        cache.clear()

    def test_login_repetido_retorna_429(self) -> None:
        cuerpo = {"email": "throttle@test.com", "password": "clave1234!"}
        with mock.patch.object(AuthRateThrottle, "rate", "2/minute", create=True):
            primero = self.cliente.post("/api/auth/login/", cuerpo, format="json")
            self.assertEqual(primero.status_code, 200)
            segundo = self.cliente.post("/api/auth/login/", cuerpo, format="json")
            self.assertEqual(segundo.status_code, 200)
            tercero = self.cliente.post("/api/auth/login/", cuerpo, format="json")
            self.assertEqual(tercero.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
