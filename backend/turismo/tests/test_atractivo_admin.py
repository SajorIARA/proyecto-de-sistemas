from __future__ import annotations

from django.contrib.gis.geos import Point
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from turismo.models import Atractivo, Categoria
from usuarios.models import Rol, Usuario

ADMIN_URL = "/api/turismo/admin/atractivos/"
PUBLIC_URL = "/api/turismo/atractivos/"
MURILLO = {"longitud": -68.1486, "latitud": -16.4966}
ILLIMANI = {"longitud": -67.7833, "latitud": -16.6333}


def _crear_usuario(email: str, codigo_rol: str) -> Usuario:
    usuario = Usuario.objects.create_user(
        email=email, password="clave1234!", nombre=f"User {codigo_rol}"
    )
    rol, _ = Rol.objects.get_or_create(
        codigo=codigo_rol,
        defaults={"nombre": codigo_rol, "descripcion": f"Rol {codigo_rol}"},
    )
    usuario.roles.add(rol)
    return usuario


def _payload(nombre: str = "Plaza Murillo", **extras) -> dict:
    data = {
        "nombre": nombre,
        "descripcion": "Plaza principal de La Paz.",
        "direccion": "Casco central",
        "duracion_minutos": 60,
        "ubicacion": dict(MURILLO),
    }
    data.update(extras)
    return data


class AtractivoAdminPermisosTests(TestCase):
    """Control de permisos del CRUD de destinos (issue #13)."""

    def setUp(self) -> None:
        self.cliente = APIClient()
        _crear_usuario("admin_dest@test.com", "ADMIN")
        _crear_usuario("turista_dest@test.com", "TOURIST")
        resp = self.cliente.post(
            "/api/auth/login/",
            {"email": "admin_dest@test.com", "password": "clave1234!"},
            format="json",
        )
        self.token_admin = resp.data["access"]
        resp = self.cliente.post(
            "/api/auth/login/",
            {"email": "turista_dest@test.com", "password": "clave1234!"},
            format="json",
        )
        self.token_turista = resp.data["access"]

    def test_anonimo_post_rechazado(self) -> None:
        resp = self.cliente.post(ADMIN_URL, _payload(), format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonimo_get_rechazado(self) -> None:
        resp = self.cliente.get(ADMIN_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_turista_post_prohibido(self) -> None:
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_turista}")
        resp = self.cliente.post(ADMIN_URL, _payload(), format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_turista_get_prohibido(self) -> None:
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_turista}")
        resp = self.cliente.get(ADMIN_URL)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class AtractivoAdminCRUDTests(TestCase):
    """CRUD completo + persistencia PostGIS (issue #13)."""

    def setUp(self) -> None:
        self.cliente = APIClient()
        _crear_usuario("admin_crud_dest@test.com", "ADMIN")
        resp = self.cliente.post(
            "/api/auth/login/",
            {"email": "admin_crud_dest@test.com", "password": "clave1234!"},
            format="json",
        )
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        self.categoria = Categoria.objects.create(
            nombre="Plazas", descripcion="Plazas paceñas"
        )

    def test_crear_destino_persiste_point_postgis(self) -> None:
        resp = self.cliente.post(ADMIN_URL, _payload(), format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        atractivo = Atractivo.objects.get(nombre="Plaza Murillo")
        self.assertIsInstance(atractivo.ubicacion, Point)
        self.assertEqual(atractivo.ubicacion.srid, 4326)
        self.assertAlmostEqual(atractivo.ubicacion.x, MURILLO["longitud"])
        self.assertAlmostEqual(atractivo.ubicacion.y, MURILLO["latitud"])

    def test_crear_destino_con_categorias(self) -> None:
        resp = self.cliente.post(
            ADMIN_URL,
            _payload(categorias=[self.categoria.id_categoria]),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        atractivo = Atractivo.objects.get(nombre="Plaza Murillo")
        self.assertTrue(atractivo.categorias.filter(pk=self.categoria.pk).exists())

    def test_crear_sin_ubicacion_retorna_400(self) -> None:
        data = _payload()
        del data["ubicacion"]
        resp = self.cliente.post(ADMIN_URL, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crear_ubicacion_incompleta_retorna_400(self) -> None:
        resp = self.cliente.post(
            ADMIN_URL, _payload(ubicacion={"longitud": -68.1}), format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crear_coordenadas_fuera_de_rango_retorna_400(self) -> None:
        resp = self.cliente.post(
            ADMIN_URL,
            _payload(ubicacion={"longitud": 500.0, "latitud": -16.5}),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_listar_destinos_admin(self) -> None:
        self.cliente.post(ADMIN_URL, _payload(), format="json")
        resp = self.cliente.get(ADMIN_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)

    def test_detalle_destino_admin(self) -> None:
        creado = self.cliente.post(ADMIN_URL, _payload(), format="json").data
        resp = self.cliente.get(f"{ADMIN_URL}{creado['id_atractivo']}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["nombre"], "Plaza Murillo")

    def test_actualizar_destino_put(self) -> None:
        creado = self.cliente.post(ADMIN_URL, _payload(), format="json").data
        resp = self.cliente.put(
            f"{ADMIN_URL}{creado['id_atractivo']}/",
            _payload(nombre="Plaza Murillo Renovada", ubicacion=dict(ILLIMANI)),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        atractivo = Atractivo.objects.get(pk=creado["id_atractivo"])
        self.assertEqual(atractivo.nombre, "Plaza Murillo Renovada")
        self.assertAlmostEqual(atractivo.ubicacion.x, ILLIMANI["longitud"])
        self.assertAlmostEqual(atractivo.ubicacion.y, ILLIMANI["latitud"])

    def test_actualizar_parcial_patch(self) -> None:
        creado = self.cliente.post(ADMIN_URL, _payload(), format="json").data
        resp = self.cliente.patch(
            f"{ADMIN_URL}{creado['id_atractivo']}/",
            {"activo": False},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        atractivo = Atractivo.objects.get(pk=creado["id_atractivo"])
        self.assertFalse(atractivo.activo)

    def test_eliminar_destino(self) -> None:
        creado = self.cliente.post(ADMIN_URL, _payload(), format="json").data
        resp = self.cliente.delete(f"{ADMIN_URL}{creado['id_atractivo']}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Atractivo.objects.filter(pk=creado["id_atractivo"]).exists())

    def test_destino_creado_aparece_en_catalogo_publico(self) -> None:
        self.cliente.post(ADMIN_URL, _payload(), format="json")
        anonimo = APIClient()
        resp = anonimo.get(PUBLIC_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        nombres = [item["nombre"] for item in resp.data["results"]]
        self.assertIn("Plaza Murillo", nombres)
