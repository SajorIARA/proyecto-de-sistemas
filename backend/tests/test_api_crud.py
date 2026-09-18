from __future__ import annotations

from decimal import Decimal

from django.contrib.gis.geos import Point
from django.test import TestCase
from rest_framework.test import APIClient

from conocimiento.models import FragmentoDocumental, FuenteDocumental
from recomendaciones.models import ConsultaRecomendacion, UsuarioPreferencia
from turismo.models import (
    Atractivo,
    Categoria,
)
from usuarios.models import Rol, Usuario


def _crear_admin() -> tuple[Usuario, dict]:
    u = Usuario.objects.create_user(
        email="admin_crud@test.com", password="clave1234!", nombre="Admin CRUD"
    )
    rol, _ = Rol.objects.get_or_create(
        codigo="ADMIN", defaults={"nombre": "Administrador"}
    )
    u.roles.add(rol)
    return u


def _login_admin(cliente: APIClient) -> dict:
    resp = cliente.post(
        "/api/auth/login/",
        {"email": "admin_crud@test.com", "password": "clave1234!"},
        format="json",
    )
    return resp.data


# ═══════════════════════════════════════════════════════════════════════
# TURISMO — CRUD
# ═══════════════════════════════════════════════════════════════════════


class TurismoCategoriaCRUDTests(TestCase):
    def setUp(self) -> None:
        self.cliente = APIClient()
        _crear_admin()
        tokens = _login_admin(self.cliente)
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_list_categorias(self) -> None:
        Categoria.objects.create(nombre="Naturaleza")
        resp = self.cliente.get("/api/turismo/categorias/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 1)

    def test_create_categoria(self) -> None:
        resp = self.cliente.post(
            "/api/turismo/categorias/",
            {"nombre": "Cultura", "descripcion": "Sitios culturales"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["nombre"], "Cultura")

    def test_retrieve_categoria(self) -> None:
        cat = Categoria.objects.create(nombre="Gastronomía")
        resp = self.cliente.get(f"/api/turismo/categorias/{cat.id_categoria}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["nombre"], "Gastronomía")

    def test_update_categoria(self) -> None:
        cat = Categoria.objects.create(nombre="Viejo")
        resp = self.cliente.patch(
            f"/api/turismo/categorias/{cat.id_categoria}/",
            {"nombre": "Nuevo"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["nombre"], "Nuevo")

    def test_delete_categoria(self) -> None:
        cat = Categoria.objects.create(nombre="Borrar")
        resp = self.cliente.delete(f"/api/turismo/categorias/{cat.id_categoria}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(
            Categoria.objects.filter(id_categoria=cat.id_categoria).exists()
        )

    def test_read_public_without_auth(self) -> None:
        self.cliente.credentials()
        Categoria.objects.create(nombre="Public")
        resp = self.cliente.get("/api/turismo/categorias/")
        self.assertEqual(resp.status_code, 200)

    def test_write_requires_auth(self) -> None:
        self.cliente.credentials()
        resp = self.cliente.post(
            "/api/turismo/categorias/",
            {"nombre": "NoAuth"},
            format="json",
        )
        self.assertIn(resp.status_code, (401, 403))


class TurismoTipoTarifaCRUDTests(TestCase):
    def setUp(self) -> None:
        self.cliente = APIClient()
        _crear_admin()
        tokens = _login_admin(self.cliente)
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_crud_tipos_tarifa(self) -> None:
        resp = self.cliente.post(
            "/api/turismo/tipos-tarifa/",
            {"codigo": "EST", "nombre": "Estándar"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        id_tipo = resp.data["id_tipo_tarifa"]

        resp = self.cliente.get(f"/api/turismo/tipos-tarifa/{id_tipo}/")
        self.assertEqual(resp.status_code, 200)

        resp = self.cliente.patch(
            f"/api/turismo/tipos-tarifa/{id_tipo}/",
            {"nombre": "Estándar Plus"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)

        resp = self.cliente.delete(f"/api/turismo/tipos-tarifa/{id_tipo}/")
        self.assertEqual(resp.status_code, 204)


class TurismoAtractivoPublicTests(TestCase):
    def setUp(self) -> None:
        self.atractivo = Atractivo.objects.create(
            nombre="Museo Test",
            descripcion="Museo",
            ubicacion=Point(-68.1, -16.5, srid=4326),
        )

    def test_list_public(self) -> None:
        resp = self.client.get("/api/turismo/atractivos/")
        self.assertEqual(resp.status_code, 200)

    def test_search_public(self) -> None:
        resp = self.client.get("/api/turismo/atractivos/?q=museo")
        self.assertEqual(resp.json()["count"], 1)


# ═══════════════════════════════════════════════════════════════════════
# CONOCIMIENTO — CRUD
# ═══════════════════════════════════════════════════════════════════════


class ConocimientoFuenteCRUDTests(TestCase):
    def setUp(self) -> None:
        self.cliente = APIClient()
        _crear_admin()
        tokens = _login_admin(self.cliente)
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_list_fuentes(self) -> None:
        FuenteDocumental.objects.create(titulo="Guía Test", tipo="guia")
        resp = self.cliente.get("/api/conocimiento/fuentes/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 1)

    def test_create_fuente(self) -> None:
        resp = self.cliente.post(
            "/api/conocimiento/fuentes/",
            {"titulo": "Nueva Guía", "tipo": "guia"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["titulo"], "Nueva Guía")

    def test_retrieve_fuente(self) -> None:
        fuente = FuenteDocumental.objects.create(titulo="Ret Test", tipo="blog")
        resp = self.cliente.get(f"/api/conocimiento/fuentes/{fuente.id_fuente}/")
        self.assertEqual(resp.status_code, 200)

    def test_update_fuente(self) -> None:
        fuente = FuenteDocumental.objects.create(titulo="Viejo", tipo="web")
        resp = self.cliente.patch(
            f"/api/conocimiento/fuentes/{fuente.id_fuente}/",
            {"titulo": "Actualizado"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["titulo"], "Actualizado")

    def test_delete_fuente(self) -> None:
        fuente = FuenteDocumental.objects.create(titulo="Borrar", tipo="pdf")
        resp = self.cliente.delete(f"/api/conocimiento/fuentes/{fuente.id_fuente}/")
        self.assertEqual(resp.status_code, 204)

    def test_read_public_without_auth(self) -> None:
        self.cliente.credentials()
        FuenteDocumental.objects.create(titulo="Public", tipo="web")
        resp = self.cliente.get("/api/conocimiento/fuentes/")
        self.assertEqual(resp.status_code, 200)


class ConocimientoFragmentoCRUDTests(TestCase):
    def setUp(self) -> None:
        self.cliente = APIClient()
        _crear_admin()
        tokens = _login_admin(self.cliente)
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.fuente = FuenteDocumental.objects.create(titulo="Fuente", tipo="guia")

    def test_list_fragmentos(self) -> None:
        FragmentoDocumental.objects.create(
            fuente=self.fuente,
            numero_fragmento=0,
            contenido="Texto",
            embedding=[0.0] * 1536,
        )
        resp = self.cliente.get("/api/conocimiento/fragmentos/")
        self.assertEqual(resp.status_code, 200)

    def test_create_fragmento(self) -> None:
        resp = self.cliente.post(
            "/api/conocimiento/fragmentos/",
            {
                "fuente": str(self.fuente.id_fuente),
                "numero_fragmento": 1,
                "contenido": "Nuevo fragmento",
                "embedding": [0.0] * 1536,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)


# ═══════════════════════════════════════════════════════════════════════
# RECOMENDACIONES — CRUD
# ═══════════════════════════════════════════════════════════════════════


class RecomendacionesPreferenciaCRUDTests(TestCase):
    def setUp(self) -> None:
        self.cliente = APIClient()
        self.usuario = _crear_admin()
        tokens = _login_admin(self.cliente)
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.categoria = Categoria.objects.create(nombre="Naturaleza")

    def test_list_preferencias(self) -> None:
        UsuarioPreferencia.objects.create(
            usuario=self.usuario,
            categoria=self.categoria,
            nivel_interes=Decimal("0.80"),
        )
        resp = self.cliente.get("/api/recomendaciones/preferencias/")
        self.assertEqual(resp.status_code, 200)

    def test_create_preferencia(self) -> None:
        resp = self.cliente.post(
            "/api/recomendaciones/preferencias/",
            {
                "usuario": str(self.usuario.id_usuario),
                "categoria": self.categoria.id_categoria,
                "nivel_interes": "0.50",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)

    def test_delete_preferencia(self) -> None:
        pref = UsuarioPreferencia.objects.create(
            usuario=self.usuario,
            categoria=self.categoria,
            nivel_interes=Decimal("0.90"),
        )
        resp = self.cliente.delete(f"/api/recomendaciones/preferencias/{pref.id}/")
        self.assertEqual(resp.status_code, 204)


class RecomendacionesConsultaCRUDTests(TestCase):
    def setUp(self) -> None:
        self.cliente = APIClient()
        self.usuario = _crear_admin()
        tokens = _login_admin(self.cliente)
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_list_consultas(self) -> None:
        ConsultaRecomendacion.objects.create(
            usuario=self.usuario,
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("4.00"),
            punto_partida=Point(-68.1, -16.5, srid=4326),
        )
        resp = self.cliente.get("/api/recomendaciones/consultas/")
        self.assertEqual(resp.status_code, 200)

    def test_create_consulta(self) -> None:
        resp = self.cliente.post(
            "/api/recomendaciones/consultas/",
            {
                "usuario": str(self.usuario.id_usuario),
                "presupuesto_bob": "200.00",
                "tiempo_horas": "6.00",
                "punto_partida": {"type": "Point", "coordinates": [-68.1, -16.5]},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)


# ═══════════════════════════════════════════════════════════════════════
# URL NAMESPACING
# ═══════════════════════════════════════════════════════════════════════


class URLNamespacingTests(TestCase):

    def test_turismo_namespace(self) -> None:
        resp = self.client.get("/api/turismo/categorias/")
        self.assertIn(resp.status_code, (200, 401, 403))

    def test_conocimiento_namespace(self) -> None:
        resp = self.client.get("/api/conocimiento/fuentes/")
        self.assertIn(resp.status_code, (200, 401, 403))

    def test_recomendaciones_namespace(self) -> None:
        resp = self.client.get("/api/recomendaciones/preferencias/")
        self.assertIn(resp.status_code, (200, 401, 403))

    def test_root_endpoints_list(self) -> None:
        resp = self.client.get("/api/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("/api/turismo/", data["endpoints"])
        self.assertIn("/api/conocimiento/", data["endpoints"])
        self.assertIn("/api/recomendaciones/", data["endpoints"])
