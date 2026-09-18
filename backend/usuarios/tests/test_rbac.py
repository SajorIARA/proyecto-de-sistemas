from __future__ import annotations

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from usuarios.models import Rol, Usuario
from usuarios.permissions import HasRole, IsAdmin, IsTurista


def _crear_usuario_con_rol(email: str, password: str, codigo_rol: str) -> Usuario:
    usuario = Usuario.objects.create_user(
        email=email, password=password, nombre=f"User {codigo_rol}"
    )
    rol, _ = Rol.objects.get_or_create(
        codigo=codigo_rol,
        defaults={"nombre": codigo_rol, "descripcion": f"Rol {codigo_rol}"},
    )
    usuario.roles.add(rol)
    return usuario


class HasRolePermissionTests(TestCase):
    """Tests unitarios para la clase de permiso HasRole."""

    def setUp(self) -> None:
        self.usuario_admin = _crear_usuario_con_rol(
            "admin_perm@test.com", "clave1234!", "ADMIN"
        )
        self.usuario_turista = _crear_usuario_con_rol(
            "turista_perm@test.com", "clave1234!", "TOURIST"
        )

    def _request_falso(self, user) -> object:

        class FakeRequest:
            def __init__(self, u) -> None:
                self.user = u

        return FakeRequest(user)

    def test_has_role_admin_true(self) -> None:
        perm = HasRole("ADMIN")
        self.assertTrue(
            perm.has_permission(self._request_falso(self.usuario_admin), None)
        )

    def test_has_role_admin_false_para_turista(self) -> None:
        perm = HasRole("ADMIN")
        self.assertFalse(
            perm.has_permission(self._request_falso(self.usuario_turista), None)
        )

    def test_has_role_multi_rol(self) -> None:
        perm = HasRole("ADMIN", "TOURIST")
        self.assertTrue(
            perm.has_permission(self._request_falso(self.usuario_admin), None)
        )
        self.assertTrue(
            perm.has_permission(self._request_falso(self.usuario_turista), None)
        )

    def test_has_role_usuario_sin_rol(self) -> None:
        sin_rol = Usuario.objects.create_user(
            email="sinrol@test.com", password="clave1234!", nombre="Sin Rol"
        )
        perm = HasRole("ADMIN")
        self.assertFalse(perm.has_permission(self._request_falso(sin_rol), None))

    def test_has_role_usuario_no_autenticado(self) -> None:

        class Anonymous:
            is_authenticated = False

        perm = HasRole("ADMIN")
        self.assertFalse(perm.has_permission(self._request_falso(Anonymous()), None))


class IsAdminPermissionTests(TestCase):
    def setUp(self) -> None:
        self.admin = _crear_usuario_con_rol("admin@test.com", "clave1234!", "ADMIN")
        self.turista = _crear_usuario_con_rol(
            "turista@test.com", "clave1234!", "TOURIST"
        )

    def _request_falso(self, user) -> object:

        class FakeRequest:
            def __init__(self, u) -> None:
                self.user = u

        return FakeRequest(user)

    def test_is_admin_true(self) -> None:
        perm = IsAdmin()
        self.assertTrue(perm.has_permission(self._request_falso(self.admin), None))

    def test_is_admin_false_para_turista(self) -> None:
        perm = IsAdmin()
        self.assertFalse(perm.has_permission(self._request_falso(self.turista), None))


class IsTuristaPermissionTests(TestCase):
    def setUp(self) -> None:
        self.admin = _crear_usuario_con_rol("admin2@test.com", "clave1234!", "ADMIN")
        self.turista = _crear_usuario_con_rol(
            "turista2@test.com", "clave1234!", "TOURIST"
        )

    def _request_falso(self, user) -> object:

        class FakeRequest:
            def __init__(self, u) -> None:
                self.user = u

        return FakeRequest(user)

    def test_is_turista_true(self) -> None:
        perm = IsTurista()
        self.assertTrue(perm.has_permission(self._request_falso(self.turista), None))

    def test_is_turista_false_para_admin(self) -> None:
        perm = IsTurista()
        self.assertFalse(perm.has_permission(self._request_falso(self.admin), None))


class RBACAdminEndpointTests(TestCase):
    """Tests de integración para el endpoint admin-only GET /api/auth/usuarios/."""

    def setUp(self) -> None:
        self.cliente = APIClient()
        self.admin = _crear_usuario_con_rol(
            "admin_endpoint@test.com", "clave1234!", "ADMIN"
        )
        self.turista = _crear_usuario_con_rol(
            "turista_endpoint@test.com", "clave1234!", "TOURIST"
        )
        self.sin_rol = Usuario.objects.create_user(
            email="sinrol_endpoint@test.com", password="clave1234!", nombre="Sin Rol"
        )

    def _login(self, email: str, password: str) -> dict:
        resp = self.cliente.post(
            "/api/auth/login/",
            {"email": email, "password": password},
            format="json",
        )
        return resp.data

    def test_admin_puede_listar_usuarios(self) -> None:
        tokens = self._login("admin_endpoint@test.com", "clave1234!")
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        respuesta = self.cliente.get("/api/auth/usuarios/")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertIn("results", respuesta.data)
        self.assertGreaterEqual(respuesta.data["count"], 3)

    def test_admin_ve_roles_en_response(self) -> None:
        tokens = self._login("admin_endpoint@test.com", "clave1234!")
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        respuesta = self.cliente.get("/api/auth/usuarios/")
        admin_data = next(
            u
            for u in respuesta.data["results"]
            if u["email"] == "admin_endpoint@test.com"
        )
        self.assertIn("ADMIN", admin_data["roles"])

    def test_turista_no_puede_listar_usuarios(self) -> None:
        tokens = self._login("turista_endpoint@test.com", "clave1234!")
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        respuesta = self.cliente.get("/api/auth/usuarios/")
        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_sin_rol_no_puede_listar_usuarios(self) -> None:
        tokens = self._login("sinrol_endpoint@test.com", "clave1234!")
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        respuesta = self.cliente.get("/api/auth/usuarios/")
        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_no_autenticado_no_puede_listar_usuarios(self) -> None:
        respuesta = self.cliente.get("/api/auth/usuarios/")
        self.assertIn(
            respuesta.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
