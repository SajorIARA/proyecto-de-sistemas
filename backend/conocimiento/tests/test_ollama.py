from __future__ import annotations

import math
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase, override_settings

from conocimiento.models import FragmentoDocumental, FuenteDocumental
from conocimiento.ollama import (
    ClienteOllama,
    RespuestaOllamaInvalida,
)
from conocimiento.vectorization import vectorizar_fragmentos


@override_settings(
    EMBEDDING_DIM=768,
    OLLAMA_EMBED_MODEL="embeddinggemma:300m",
    OLLAMA_LLM_MODEL="qwen3:0.6b",
    OLLAMA_CONTEXT_LENGTH=4096,
    OLLAMA_MAX_PREDICT=384,
)
class ClienteOllamaTests(SimpleTestCase):
    def setUp(self) -> None:
        self.cliente = ClienteOllama(
            base_url="http://ollama:11434", timeout=1, reintentos=0
        )

    def test_valida_y_normaliza_embedding_768(self) -> None:
        with patch.object(
            self.cliente,
            "_post_json",
            return_value={"embeddings": [[2.0] + [0.0] * 767]},
        ):
            vector = self.cliente.embeddings(["texto"])[0]
        self.assertEqual(len(vector), 768)
        self.assertAlmostEqual(math.sqrt(sum(valor**2 for valor in vector)), 1.0)

    def test_rechaza_dimension_incorrecta(self) -> None:
        with patch.object(
            self.cliente,
            "_post_json",
            return_value={"embeddings": [[1.0, 2.0]]},
        ):
            with self.assertRaises(RespuestaOllamaInvalida):
                self.cliente.embeddings(["texto"])

    def test_rechaza_nan(self) -> None:
        with patch.object(
            self.cliente,
            "_post_json",
            return_value={"embeddings": [[float("nan")] + [0.0] * 767]},
        ):
            with self.assertRaises(RespuestaOllamaInvalida):
                self.cliente.embeddings(["texto"])

    def test_chat_usa_qwen_sin_modo_thinking(self) -> None:
        with patch.object(
            self.cliente,
            "_post_json",
            return_value={"message": {"content": "  Respuesta breve.  "}},
        ) as post:
            respuesta = self.cliente.chat([{"role": "user", "content": "Hola"}])
        self.assertEqual(respuesta, "Respuesta breve.")
        payload = post.call_args.args[1]
        self.assertEqual(payload["model"], "qwen3:0.6b")
        self.assertFalse(payload["think"])
        self.assertEqual(payload["options"]["num_ctx"], 4096)


class _ClienteFalso:
    def __init__(self) -> None:
        self.llamadas: list[list[str]] = []

    def embeddings(self, textos):
        entradas = list(textos)
        self.llamadas.append(entradas)
        return [[1.0] + [0.0] * 767 for _ in entradas]


@override_settings(
    EMBEDDING_DIM=768,
    OLLAMA_EMBED_MODEL="embeddinggemma:300m",
)
class VectorizacionTests(TestCase):
    def setUp(self) -> None:
        self.fuente = FuenteDocumental.objects.create(
            titulo="Valle de la Luna",
            tipo="web",
        )
        self.fragmento = FragmentoDocumental.objects.create(
            fuente=self.fuente,
            numero_fragmento=0,
            contenido="Formaciones naturales cerca de La Paz.",
        )

    def test_vectoriza_y_guarda_metadatos(self) -> None:
        cliente = _ClienteFalso()
        resultado = vectorizar_fragmentos(cliente=cliente)
        self.fragmento.refresh_from_db()
        self.assertEqual(resultado.vectorizados, 1)
        self.assertEqual(len(self.fragmento.embedding), 768)
        self.assertEqual(self.fragmento.embedding_modelo, "embeddinggemma:300m")
        self.assertEqual(self.fragmento.embedding_dimension, 768)
        self.assertIsNotNone(self.fragmento.embedding_actualizado)
        self.assertIn("title: Valle de la Luna", cliente.llamadas[0][0])

    def test_no_revectoriza_si_modelo_y_dimension_coinciden(self) -> None:
        cliente = _ClienteFalso()
        vectorizar_fragmentos(cliente=cliente)
        segundo = _ClienteFalso()
        resultado = vectorizar_fragmentos(cliente=segundo)
        self.assertEqual(resultado.vectorizados, 0)
        self.assertEqual(segundo.llamadas, [])
