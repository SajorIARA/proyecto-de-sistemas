"""Contrato y degradación del proxy de ruteo OSRM."""

from __future__ import annotations

import io
import json
import urllib.error
from unittest.mock import patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

RUTEO_URL = "/api/turismo/ruteo/"
PUNTOS = [
    {"latitud": -16.4957, "longitud": -68.133},
    {"latitud": -16.5, "longitud": -68.14},
]


def _respuesta(datos: object) -> io.BytesIO:
    return io.BytesIO(json.dumps(datos).encode("utf-8"))


class RuteoViewTests(TestCase):
    def setUp(self) -> None:
        self.cliente = APIClient()

    @patch("turismo.views_ruteo.urllib.request.urlopen")
    def test_osrm_devuelve_trazado_en_lat_lon(self, urlopen) -> None:
        urlopen.return_value = _respuesta(
            {
                "code": "Ok",
                "routes": [
                    {
                        "distance": 1500,
                        "duration": 600,
                        "geometry": {
                            "coordinates": [[-68.133, -16.4957], [-68.14, -16.5]]
                        },
                    }
                ],
            }
        )
        respuesta = self.cliente.post(RUTEO_URL, {"puntos": PUNTOS}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["origen"], "osrm")
        self.assertEqual(respuesta.data["distancia_km"], 1.5)
        self.assertEqual(respuesta.data["duracion_minutos"], 10.0)
        self.assertEqual(
            respuesta.data["trazado"], [[-16.4957, -68.133], [-16.5, -68.14]]
        )

    @patch("turismo.views_ruteo.urllib.request.urlopen")
    def test_respuesta_no_diccionario_es_502(self, urlopen) -> None:
        urlopen.return_value = _respuesta(["inesperado"])
        respuesta = self.cliente.post(RUTEO_URL, {"puntos": PUNTOS}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_502_BAD_GATEWAY)

    @patch("turismo.views_ruteo.urllib.request.urlopen")
    def test_ruta_sin_metricas_es_502(self, urlopen) -> None:
        urlopen.return_value = _respuesta(
            {
                "code": "Ok",
                "routes": [
                    {
                        "geometry": {
                            "coordinates": [[-68.133, -16.4957], [-68.14, -16.5]]
                        }
                    }
                ],
            }
        )
        respuesta = self.cliente.post(RUTEO_URL, {"puntos": PUNTOS}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_502_BAD_GATEWAY)

    @patch("turismo.views_ruteo.urllib.request.urlopen")
    def test_fallo_de_osrm_es_503(self, urlopen) -> None:
        urlopen.side_effect = urllib.error.URLError("sin red")
        respuesta = self.cliente.post(RUTEO_URL, {"puntos": PUNTOS}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_un_solo_punto_es_400(self) -> None:
        respuesta = self.cliente.post(RUTEO_URL, {"puntos": PUNTOS[:1]}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
