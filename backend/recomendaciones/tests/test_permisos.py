from __future__ import annotations

from decimal import Decimal

from django.contrib.gis.geos import Point
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from recomendaciones.models import ConsultaRecomendacion, UsuarioPreferencia
from turismo.models import Categoria
from usuarios.models import Rol, Usuario


def _usuario(email: str, rol: str) -> Usuario:
    u = Usuario.objects.create_user(
        email=email, password="Clave99!", nombre=email.split("@")[0]
    )
    r, _ = Rol.objects.get_or_create(codigo=rol, defaults={"nombre": rol})
    u.roles.add(r)
    return u


def _login(cliente: APIClient, email: str) -> str:
    resp = cliente.post(
        "/api/auth/login/",
        {"email": email, "password": "Clave99!"},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    return resp.data["access"]


class RecomendacionesPermisosTests(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.admin = _usuario("perm_admin@test.com", "ADMIN")
        cls.turista = _usuario("perm_turista@test.com", "TOURIST")
        cls.otro = _usuario("perm_otro@test.com", "TOURIST")
        cls.categoria = Categoria.objects.create(nombre="Permisos")
        UsuarioPreferencia.objects.create(
            usuario=cls.turista,
            categoria=cls.categoria,
            nivel_interes=Decimal("0.80"),
        )
        UsuarioPreferencia.objects.create(
            usuario=cls.otro,
            categoria=cls.categoria,
            nivel_interes=Decimal("0.50"),
        )

    def test_anonimo_no_lee_preferencias(self) -> None:
        resp = APIClient().get("/api/recomendaciones/preferencias/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonimo_no_lee_consultas(self) -> None:
        resp = APIClient().get("/api/recomendaciones/consultas/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_turista_solo_ve_lo_propio(self) -> None:
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {_login(c, self.turista.email)}")
        resp = c.get("/api/recomendaciones/preferencias/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(
            str(resp.data["results"][0]["usuario"]), str(self.turista.id_usuario)
        )

    def test_turista_no_escribe(self) -> None:
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {_login(c, self.turista.email)}")
        resp = c.post(
            "/api/recomendaciones/preferencias/",
            {
                "usuario": str(self.turista.id_usuario),
                "categoria": self.categoria.id_categoria,
                "nivel_interes": "0.90",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_ve_todo(self) -> None:
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {_login(c, self.admin.email)}")
        resp = c.get("/api/recomendaciones/preferencias/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 2)

    def test_turista_puede_crear_consusta_y_el_usuario_es_del_jwt(self) -> None:
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {_login(c, self.turista.email)}")
        resp = c.post(
            "/api/recomendaciones/consultas/",
            {
                "usuario": str(self.otro.id_usuario),
                "presupuesto_bob": "100.00",
                "tiempo_horas": "4",
                "punto_partida": {"coordinates": [-68.133, -16.4957]},
                "macrodistrito": "Centro",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        consulta = ConsultaRecomendacion.objects.get(
            id_consulta=resp.data["id_consulta"]
        )
        self.assertEqual(consulta.usuario_id, self.turista.id_usuario)
        self.assertNotEqual(consulta.usuario_id, self.otro.id_usuario)

    def test_turista_solo_ve_sus_consultas_y_admin_todas(self) -> None:
        punto = Point(-68.133, -16.4957, srid=4326)
        consulta_turista = ConsultaRecomendacion.objects.create(
            usuario=self.turista,
            presupuesto_bob="50.00",
            tiempo_horas=2,
            punto_partida=punto,
        )
        ConsultaRecomendacion.objects.create(
            usuario=self.otro,
            presupuesto_bob="50.00",
            tiempo_horas=2,
            punto_partida=punto,
        )
        cliente = APIClient()
        cliente.credentials(
            HTTP_AUTHORIZATION=f"Bearer {_login(cliente, self.turista.email)}"
        )
        resp = cliente.get("/api/recomendaciones/consultas/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(
            resp.data["results"][0]["id_consulta"], str(consulta_turista.id_consulta)
        )

        admin = APIClient()
        admin.credentials(
            HTTP_AUTHORIZATION=f"Bearer {_login(admin, self.admin.email)}"
        )
        resp = admin.get("/api/recomendaciones/consultas/")
        self.assertEqual(resp.data["count"], 2)
