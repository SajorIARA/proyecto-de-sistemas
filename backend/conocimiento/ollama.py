"""Cliente mínimo y validado para el contenedor Ollama aislado."""

from __future__ import annotations

import json
import math
import time
from typing import Iterable
from urllib import error, request
from urllib.parse import urlsplit

from django.conf import settings


class OllamaError(Exception):
    """Error controlado de inferencia local."""


class OllamaNoDisponible(OllamaError):
    """Ollama no respondió o está temporalmente saturado."""


class RespuestaOllamaInvalida(OllamaError):
    """Ollama respondió con datos incompatibles con el contrato."""


class ClienteOllama:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        timeout: float | None = None,
        reintentos: int | None = None,
    ) -> None:
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        partes = urlsplit(self.base_url)
        if partes.scheme not in {"http", "https"} or not partes.hostname:
            raise ValueError("OLLAMA_BASE_URL debe ser una URL HTTP válida.")
        if partes.username or partes.password:
            raise ValueError("OLLAMA_BASE_URL no debe contener credenciales.")
        self.timeout = (
            timeout if timeout is not None else settings.OLLAMA_TIMEOUT_SECONDS
        )
        self.reintentos = (
            reintentos if reintentos is not None else settings.OLLAMA_RETRIES
        )

    def _post_json(self, ruta: str, payload: dict) -> dict:
        datos = json.dumps(payload).encode("utf-8")
        peticion = request.Request(
            f"{self.base_url}{ruta}",
            data=datos,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        ultimo_error: Exception | None = None
        for intento in range(self.reintentos + 1):
            try:
                with request.urlopen(peticion, timeout=self.timeout) as respuesta:
                    cuerpo = respuesta.read(10 * 1024 * 1024 + 1)
                    if len(cuerpo) > 10 * 1024 * 1024:
                        raise RespuestaOllamaInvalida(
                            "La respuesta de Ollama supera el límite permitido."
                        )
                    resultado = json.loads(cuerpo.decode("utf-8"))
                    if not isinstance(resultado, dict):
                        raise RespuestaOllamaInvalida(
                            "Ollama no devolvió un objeto JSON."
                        )
                    return resultado
            except error.HTTPError as exc:
                if exc.code < 500 and exc.code != 429:
                    raise OllamaError(f"Ollama respondió HTTP {exc.code}.") from exc
                ultimo_error = exc
            except (error.URLError, TimeoutError, OSError) as exc:
                ultimo_error = exc
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise RespuestaOllamaInvalida(
                    "Ollama devolvió una respuesta que no es JSON válido."
                ) from exc
            if intento < self.reintentos:
                time.sleep(0.25 * (2**intento))
        raise OllamaNoDisponible(
            f"Ollama no está disponible después de {self.reintentos + 1} intentos."
        ) from ultimo_error

    def embeddings(
        self,
        textos: Iterable[str],
        *,
        modelo: str | None = None,
        dimension: int | None = None,
    ) -> list[list[float]]:
        entradas = list(textos)
        if not entradas or any(not texto.strip() for texto in entradas):
            raise ValueError("Los textos para embedding no pueden estar vacíos.")
        dimension_esperada = dimension or settings.EMBEDDING_DIM
        resultado = self._post_json(
            "/api/embed",
            {
                "model": modelo or settings.OLLAMA_EMBED_MODEL,
                "input": entradas,
                "truncate": True,
                "keep_alive": "5m",
            },
        )
        vectores = resultado.get("embeddings")
        if not isinstance(vectores, list) or len(vectores) != len(entradas):
            raise RespuestaOllamaInvalida(
                "La cantidad de embeddings no coincide con las entradas."
            )
        return [self._validar_vector(vector, dimension_esperada) for vector in vectores]

    @staticmethod
    def _validar_vector(vector, dimension: int) -> list[float]:
        if not isinstance(vector, list) or len(vector) != dimension:
            raise RespuestaOllamaInvalida(
                f"El embedding debe tener exactamente {dimension} dimensiones."
            )
        try:
            valores = [float(valor) for valor in vector]
        except (TypeError, ValueError) as exc:
            raise RespuestaOllamaInvalida(
                "El embedding contiene valores no numéricos."
            ) from exc
        if not all(math.isfinite(valor) for valor in valores):
            raise RespuestaOllamaInvalida("El embedding contiene NaN o infinito.")
        norma = math.sqrt(math.fsum(valor * valor for valor in valores))
        if norma <= 1e-12:
            raise RespuestaOllamaInvalida("El embedding tiene norma cero.")
        # Cosine funciona sin normalizar, pero persistir vectores unitarios
        # facilita validar y comparar salidas entre versiones del modelo.
        return [valor / norma for valor in valores]

    def chat(self, mensajes: list[dict[str, str]]) -> str:
        if not mensajes or any(
            mensaje.get("role") not in {"system", "user", "assistant"}
            or not mensaje.get("content", "").strip()
            for mensaje in mensajes
        ):
            raise ValueError("La conversación contiene mensajes inválidos.")
        resultado = self._post_json(
            "/api/chat",
            {
                "model": settings.OLLAMA_LLM_MODEL,
                "messages": mensajes,
                "stream": False,
                "think": False,
                "keep_alive": "5m",
                "options": {
                    "num_ctx": settings.OLLAMA_CONTEXT_LENGTH,
                    "num_predict": settings.OLLAMA_MAX_PREDICT,
                    "temperature": 0.2,
                },
            },
        )
        mensaje = resultado.get("message")
        contenido = mensaje.get("content") if isinstance(mensaje, dict) else None
        if not isinstance(contenido, str) or not contenido.strip():
            raise RespuestaOllamaInvalida("Ollama devolvió una respuesta vacía.")
        return contenido.strip()
