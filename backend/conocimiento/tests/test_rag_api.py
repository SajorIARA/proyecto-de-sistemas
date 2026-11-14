from __future__ import annotations

from unittest import mock

from django.contrib.gis.geos import Point
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from conocimiento.models import FragmentoDocumental, FuenteDocumental
from conocimiento.ollama import OllamaNoDisponible, RespuestaOllamaInvalida
from conocimiento.rag import RESPUESTA_SIN_CONTEXTO
from conocimiento.throttles import RAGAnonRateThrottle
from turismo.models import Atractivo

RUTA = "/api/conocimiento/consultar/"
VECTOR_DIM = 768


def _vector(posicion: int, valor: float = 1.0) -> list[float]:
    vector = [0.0] * VECTOR_DIM
    vector[posicion] = valor
    return vector


def _atractivo(nombre: str, longitud: float, latitud: float) -> Atractivo:
    return Atractivo.objects.create(
        nombre=nombre,
        descripcion="Atractivo ficticio de prueba.",
        ubicacion=Point(longitud, latitud, srid=4326),
        fuente_origen="ZZTEST",
    )


class _ClienteFalso:
    def __init__(
        self,
        respuesta: str = "La entrada cuesta 25 BOB.",
        vector: list[float] | None = None,
    ) -> None:
        self.respuesta = respuesta
        self.vector = vector or _vector(0)
        self.mensajes: list[dict[str, str]] = []
        self.llamadas_chat = 0

    def embeddings(self, textos):
        return [self.vector for _ in textos]

    def chat(self, mensajes):
        self.llamadas_chat += 1
        self.mensajes = mensajes
        return self.respuesta


class ConsultaRAGAPITests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.cliente = APIClient()
        self.atractivo_alpha = _atractivo("ZZTEST Alpha", -68.16, -16.51)
        self.atractivo_beta = _atractivo("ZZTEST Beta", -68.22, -16.45)
        self.fuente_alpha = FuenteDocumental.objects.create(
            titulo="ZZTEST-Alpha",
            url="https://alpha.zztest.invalid/",
            tipo="ficticia",
            atractivo=self.atractivo_alpha,
        )
        self.fuente_beta = FuenteDocumental.objects.create(
            titulo="ZZTEST-Beta",
            url="https://beta.zztest.invalid/",
            tipo="ficticia",
            atractivo=self.atractivo_beta,
        )
        FragmentoDocumental.objects.create(
            fuente=self.fuente_alpha,
            numero_fragmento=0,
            contenido="La tarifa del Valle de los Espejos es 25 BOB.",
            embedding=_vector(0),
        )
        FragmentoDocumental.objects.create(
            fuente=self.fuente_beta,
            numero_fragmento=0,
            contenido="La tarifa de la Laguna de Cristal es 40 BOB.",
            embedding=_vector(1),
        )

    def tearDown(self) -> None:
        cache.clear()

    def _post(self, cuerpo: dict, cliente) -> object:
        with mock.patch("conocimiento.views.ClienteOllama", return_value=cliente):
            return self.cliente.post(RUTA, cuerpo, format="json")

    def test_devuelve_respuesta_y_citas_sin_exponer_embedding(self) -> None:
        respuesta = self._post(
            {"pregunta": "¿Cuánto cuesta la entrada?"}, _ClienteFalso()
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["respuesta"], "La entrada cuesta 25 BOB.")
        self.assertEqual(respuesta.data["recuperados"], 1)
        self.assertEqual(len(respuesta.data["citas"]), 1)
        cita = respuesta.data["citas"][0]
        self.assertEqual(cita["titulo"], "ZZTEST-Alpha")
        self.assertEqual(cita["url"], "https://alpha.zztest.invalid/")
        self.assertIn("distancia", cita)
        self.assertNotIn("embedding", respuesta.data)
        self.assertNotIn("embedding", cita)
        self.assertNotIn("contenido", cita)

    def test_sin_contexto_no_invoca_al_llm(self) -> None:
        FragmentoDocumental.objects.all().delete()
        cliente = _ClienteFalso()

        respuesta = self._post({"pregunta": "¿Pregunta sin fuentes?"}, cliente)

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["respuesta"], RESPUESTA_SIN_CONTEXTO)
        self.assertEqual(respuesta.data["recuperados"], 0)
        self.assertEqual(respuesta.data["citas"], [])
        self.assertEqual(cliente.llamadas_chat, 0)

    def test_filtra_por_fuente(self) -> None:
        respuesta = self._post(
            {
                "pregunta": "¿Cuánto cuesta?",
                "id_fuente": str(self.fuente_alpha.id_fuente),
            },
            _ClienteFalso(),
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [cita["titulo"] for cita in respuesta.data["citas"]],
            ["ZZTEST-Alpha"],
        )

    def test_filtra_por_atractivo(self) -> None:
        respuesta = self._post(
            {
                "pregunta": "¿Cuánto cuesta?",
                "id_atractivo": str(self.atractivo_beta.id_atractivo),
            },
            _ClienteFalso(vector=_vector(1)),
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [cita["titulo"] for cita in respuesta.data["citas"]],
            ["ZZTEST-Beta"],
        )

    def test_ollama_no_disponible_en_embedding_devuelve_503(self) -> None:
        cliente = _ClienteFalso()
        cliente.embeddings = mock.Mock(side_effect=OllamaNoDisponible("Ollama caído"))

        respuesta = self._post({"pregunta": "¿Cuánto cuesta?"}, cliente)

        self.assertEqual(respuesta.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertNotIn("Ollama caído", respuesta.data["detail"])

    def test_respuesta_invalida_de_ollama_devuelve_502(self) -> None:
        cliente = _ClienteFalso()
        cliente.embeddings = mock.Mock(
            side_effect=RespuestaOllamaInvalida("dimensión incorrecta")
        )

        respuesta = self._post({"pregunta": "¿Cuánto cuesta?"}, cliente)

        self.assertEqual(respuesta.status_code, status.HTTP_502_BAD_GATEWAY)

    def test_ollama_no_disponible_en_chat_devuelve_503(self) -> None:
        cliente = _ClienteFalso()
        cliente.chat = mock.Mock(side_effect=OllamaNoDisponible("Ollama caído"))

        respuesta = self._post({"pregunta": "¿Cuánto cuesta?"}, cliente)

        self.assertEqual(respuesta.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_valida_pregunta_y_top_k(self) -> None:
        casos = (
            {"pregunta": ""},
            {"pregunta": "   "},
            {"pregunta": "x" * 501},
            {"pregunta": "¿Cuánto cuesta?", "top_k": 0},
            {"pregunta": "¿Cuánto cuesta?", "top_k": 9},
        )
        for cuerpo in casos:
            with self.subTest(cuerpo=cuerpo):
                respuesta = self._post(cuerpo, _ClienteFalso())
                self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_throttle_anonimo_limita_consultas(self) -> None:
        cliente = _ClienteFalso()
        with mock.patch.object(RAGAnonRateThrottle, "rate", "2/minute", create=True):
            primera = self._post({"pregunta": "¿Cuánto cuesta?"}, cliente)
            segunda = self._post({"pregunta": "¿Cuánto cuesta?"}, cliente)
            tercera = self._post({"pregunta": "¿Cuánto cuesta?"}, cliente)

        self.assertEqual(primera.status_code, status.HTTP_200_OK)
        self.assertEqual(segunda.status_code, status.HTTP_200_OK)
        self.assertEqual(tercera.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
