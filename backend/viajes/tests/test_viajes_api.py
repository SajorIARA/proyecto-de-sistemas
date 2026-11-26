"""Contrato HTTP de la API de viajes (issue de persistencia de rutas).

La URLconf local evita depender de que ``config.urls`` ya incluya el módulo;
cuando el cableado esté listo, las mismas rutas quedan bajo ``/api/viajes/``.
"""

from __future__ import annotations

import uuid

from django.contrib.gis.geos import Point
from django.test import TestCase, override_settings
from django.urls import include, path
from rest_framework import status
from rest_framework.test import APIClient

from turismo.models import Atractivo
from usuarios.models import Rol, Usuario

from ..models import Viaje

urlpatterns = [path("api/viajes/", include("viajes.urls"))]


def _crear_usuario(email: str, codigo_rol: str) -> Usuario:
    usuario = Usuario.objects.create_user(
        email=email, password="Clave99!", nombre=email.split("@")[0]
    )
    rol, _ = Rol.objects.get_or_create(
        codigo=codigo_rol,
        defaults={"nombre": codigo_rol.title()},
    )
    usuario.roles.add(rol)
    return usuario


def _crear_atractivo(nombre: str) -> Atractivo:
    return Atractivo.objects.create(
        nombre=nombre,
        descripcion=f"Descripción de {nombre}",
        ubicacion=Point(-68.133, -16.4957, srid=4326),
    )


@override_settings(ROOT_URLCONF=__name__)
class ViajesAPITests(TestCase):
    """Creación, listado, estados, visitas y aislamiento por usuario."""

    @classmethod
    def setUpTestData(cls) -> None:
        cls.turista = _crear_usuario("viajes-turista@example.com", Rol.Codes.TOURIST)
        cls.otro = _crear_usuario("viajes-otro@example.com", Rol.Codes.TOURIST)
        cls.admin = _crear_usuario("viajes-admin@example.com", Rol.Codes.ADMIN)
        cls.a1 = _crear_atractivo("Plaza Murillo")
        cls.a2 = _crear_atractivo("Basílica de San Francisco")
        cls.a3 = _crear_atractivo("Mirador Killi Killi")

    def setUp(self) -> None:
        self.cliente = APIClient()
        self.cliente.force_authenticate(user=self.turista)

    def _crear_viaje(self, nombre: str = "Mi ruta"):
        respuesta = self.cliente.post(
            "/api/viajes/",
            {
                "nombre": nombre,
                "paradas": [str(self.a1.id_atractivo), str(self.a2.id_atractivo)],
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED, respuesta.data)
        return respuesta.data

    def test_crear_viaje_con_paradas(self) -> None:
        datos = self._crear_viaje()

        self.assertEqual(datos["nombre"], "Mi ruta")
        self.assertEqual(datos["estado"], "planificado")
        self.assertEqual(
            [parada["atractivo"] for parada in datos["paradas"]],
            [str(self.a1.id_atractivo), str(self.a2.id_atractivo)],
        )
        self.assertEqual([parada["orden"] for parada in datos["paradas"]], [0, 1])
        self.assertEqual(datos["paradas"][0]["nombre"], self.a1.nombre)
        self.assertFalse(datos["paradas"][0]["visitada"])
        self.assertIsNone(datos["paradas"][0]["visitada_en"])
        creado = Viaje.objects.get(pk=datos["id"])
        self.assertEqual(creado.usuario, self.turista)
        self.assertEqual(creado.paradas.count(), 2)

    def test_listar_solo_propios_incluso_si_es_admin(self) -> None:
        propio = self._crear_viaje("Viaje propio")
        ajeno = Viaje.objects.create(usuario=self.otro, nombre="Viaje ajeno")
        Viaje.objects.create(usuario=self.admin, nombre="Viaje del admin")

        respuesta = self.cliente.get("/api/viajes/")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["count"], 1)
        self.assertEqual(respuesta.data["results"][0]["id"], propio["id"])
        self.assertNotEqual(respuesta.data["results"][0]["id"], str(ajeno.pk))

        self.cliente.force_authenticate(user=self.admin)
        respuesta = self.cliente.get("/api/viajes/")
        self.assertEqual(respuesta.data["count"], 1)
        self.assertEqual(respuesta.data["results"][0]["nombre"], "Viaje del admin")

    def test_iniciar_y_finalizar_son_idempotentes(self) -> None:
        viaje = self._crear_viaje()

        primera = self.cliente.post(
            f"/api/viajes/{viaje['id']}/iniciar/", format="json"
        )
        self.assertEqual(primera.status_code, status.HTTP_200_OK)
        self.assertEqual(primera.data["estado"], "en_curso")
        self.assertIsNotNone(primera.data["iniciado_en"])

        segunda = self.cliente.post(
            f"/api/viajes/{viaje['id']}/iniciar/", format="json"
        )
        self.assertEqual(segunda.status_code, status.HTTP_200_OK)
        self.assertEqual(segunda.data["iniciado_en"], primera.data["iniciado_en"])

        primera = self.cliente.post(
            f"/api/viajes/{viaje['id']}/finalizar/", format="json"
        )
        self.assertEqual(primera.status_code, status.HTTP_200_OK)
        self.assertEqual(primera.data["estado"], "finalizado")
        self.assertIsNotNone(primera.data["finalizado_en"])

        segunda = self.cliente.post(
            f"/api/viajes/{viaje['id']}/finalizar/", format="json"
        )
        self.assertEqual(segunda.data["finalizado_en"], primera.data["finalizado_en"])

    def test_marcar_visitada_y_desmarcar(self) -> None:
        viaje = self._crear_viaje()
        parada = Viaje.objects.get(pk=viaje["id"]).paradas.first()

        respuesta = self.cliente.post(
            f"/api/viajes/{viaje['id']}/paradas/{parada.pk}/visitada/",
            {"visitada": True},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        visitada = respuesta.data["paradas"][0]
        self.assertTrue(visitada["visitada"])
        self.assertIsNotNone(visitada["visitada_en"])

        # Cuerpo opcional: por defecto se marca como visitada.
        respuesta = self.cliente.post(
            f"/api/viajes/{viaje['id']}/paradas/{parada.pk}/visitada/",
            {},
            format="json",
        )
        self.assertTrue(respuesta.data["paradas"][0]["visitada"])

        respuesta = self.cliente.post(
            f"/api/viajes/{viaje['id']}/paradas/{parada.pk}/visitada/",
            {"visitada": False},
            format="json",
        )
        self.assertFalse(respuesta.data["paradas"][0]["visitada"])
        self.assertIsNone(respuesta.data["paradas"][0]["visitada_en"])

    def test_patch_reemplaza_paradas_y_conserva_visitada(self) -> None:
        viaje = self._crear_viaje()
        parada = Viaje.objects.get(pk=viaje["id"]).paradas.get(atractivo=self.a2)
        respondida = self.cliente.post(
            f"/api/viajes/{viaje['id']}/paradas/{parada.pk}/visitada/",
            format="json",
        )
        antes = respondida.data["paradas"][1]["visitada_en"]

        respuesta = self.cliente.patch(
            f"/api/viajes/{viaje['id']}/",
            {"paradas": [str(self.a2.id_atractivo), str(self.a3.id_atractivo)]},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [parada["atractivo"] for parada in respuesta.data["paradas"]],
            [str(self.a2.id_atractivo), str(self.a3.id_atractivo)],
        )
        self.assertTrue(respuesta.data["paradas"][0]["visitada"])
        self.assertFalse(respuesta.data["paradas"][1]["visitada"])

        respuesta = self.cliente.patch(
            f"/api/viajes/{viaje['id']}/",
            {
                "nombre": "Ruta actualizada",
                "paradas": [str(self.a1.id_atractivo), str(self.a2.id_atractivo)],
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["nombre"], "Ruta actualizada")
        self.assertEqual(
            [item["atractivo"] for item in respuesta.data["paradas"]],
            [str(self.a1.id_atractivo), str(self.a2.id_atractivo)],
        )
        self.assertTrue(respuesta.data["paradas"][1]["visitada"])
        self.assertEqual(respuesta.data["paradas"][1]["visitada_en"], antes)

    def test_otro_usuario_recibe_404(self) -> None:
        viaje = self._crear_viaje()
        parada = Viaje.objects.get(pk=viaje["id"]).paradas.first()
        self.cliente.force_authenticate(user=self.otro)

        self.assertEqual(
            self.cliente.get(f"/api/viajes/{viaje['id']}/").status_code, 404
        )
        self.assertEqual(
            self.cliente.patch(
                f"/api/viajes/{viaje['id']}/", {"nombre": "Robo"}, format="json"
            ).status_code,
            404,
        )
        self.assertEqual(
            self.cliente.delete(f"/api/viajes/{viaje['id']}/").status_code, 404
        )
        for sufijo in ("iniciar/", "finalizar/"):
            with self.subTest(sufijo=sufijo):
                respuesta = self.cliente.post(
                    f"/api/viajes/{viaje['id']}/{sufijo}", format="json"
                )
                self.assertEqual(respuesta.status_code, 404)
        respuesta = self.cliente.post(
            f"/api/viajes/{viaje['id']}/paradas/{parada.pk}/visitada/",
            format="json",
        )
        self.assertEqual(respuesta.status_code, 404)

    def test_anonimo_recibe_401_o_403(self) -> None:
        anonimo = APIClient()
        self.assertIn(
            anonimo.get("/api/viajes/").status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )
        self.assertIn(
            anonimo.post(
                "/api/viajes/", {"nombre": "Sin sesión"}, format="json"
            ).status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

    def test_uuid_inexistente_devuelve_400(self) -> None:
        inexistente = uuid.uuid4()
        total = Viaje.objects.count()

        respuesta = self.cliente.post(
            "/api/viajes/",
            {"nombre": "Con destino inexistente", "paradas": [str(inexistente)]},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No existe", str(respuesta.data))
        self.assertEqual(Viaje.objects.count(), total)
