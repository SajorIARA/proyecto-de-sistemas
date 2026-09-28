from __future__ import annotations

from django.contrib.gis.geos import Point
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from turismo.models import Atractivo

URL = "/api/turismo/atractivos/cercanos/"
# Plaza Murillo (La Paz) y Valle de la Luna (~10 km al sur).
MURILLO = (-68.1486, -16.4966)
VALLE_LUNA = (-68.0820, -16.5686)


def _crear(nombre: str, lon: float, lat: float, *, activo: bool = True) -> Atractivo:
    return Atractivo.objects.create(
        nombre=nombre,
        descripcion=f"Atractivo {nombre}",
        duracion_minutos=60,
        ubicacion=Point(lon, lat, srid=4326),
        activo=activo,
    )


class AtractivosCercanosTests(TestCase):
    def setUp(self) -> None:
        self.cliente = APIClient()
        _crear("Plaza Murillo", *MURILLO)
        _crear("Valle de la Luna", *VALLE_LUNA)
        _crear("Cerrado Lejano", *VALLE_LUNA, activo=False)

    def test_radio_pequeno_retorna_solo_cercano(self) -> None:
        resp = self.cliente.get(
            URL, {"lat": MURILLO[1], "lon": MURILLO[0], "radio": 2000}
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        nombres = [item["nombre"] for item in resp.data["results"]]
        self.assertEqual(nombres, ["Plaza Murillo"])
        self.assertLess(resp.data["results"][0]["distancia_m"], 2000)

    def test_radio_amplio_ordena_por_distancia(self) -> None:
        resp = self.cliente.get(
            URL, {"lat": MURILLO[1], "lon": MURILLO[0], "radio": 15000}
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        nombres = [item["nombre"] for item in resp.data["results"]]
        self.assertEqual(nombres, ["Plaza Murillo", "Valle de la Luna"])
        distancias = [item["distancia_m"] for item in resp.data["results"]]
        self.assertLess(distancias[0], distancias[1])

    def test_inactivo_excluido(self) -> None:
        resp = self.cliente.get(
            URL, {"lat": VALLE_LUNA[1], "lon": VALLE_LUNA[0], "radio": 15000}
        )
        nombres = [item["nombre"] for item in resp.data["results"]]
        self.assertNotIn("Cerrado Lejano", nombres)

    def test_sin_parametros_retorna_400(self) -> None:
        resp = self.cliente.get(URL)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_coordenadas_invalidas_retorna_400(self) -> None:
        resp = self.cliente.get(URL, {"lat": "norte", "lon": MURILLO[0]})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        resp = self.cliente.get(URL, {"lat": 500.0, "lon": MURILLO[0]})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_radio_invalido_retorna_400(self) -> None:
        resp = self.cliente.get(
            URL, {"lat": MURILLO[1], "lon": MURILLO[0], "radio": -5}
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        resp = self.cliente.get(
            URL, {"lat": MURILLO[1], "lon": MURILLO[0], "radio": 999999}
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
