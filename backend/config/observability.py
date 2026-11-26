"""Logging estructurado y métricas mínimas de la API.

Un middleware emite **una línea JSON por petición** y mantiene contadores en
memoria con ``threading.Lock``. No sustituye a Prometheus: da señales útiles
(volumen, 5xx, latencia) sin añadir dependencias ni exponer datos personales.

Los contadores se reinician al reiniciar el proceso, lo cual se documenta en
``/api/health/detallado/``.
"""

from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("observabilidad")

_bloqueo = threading.Lock()
_contadores: dict[str, Any] = {
    "peticiones": 0,
    "por_metodo": {},
    "por_estado": {},
    "errores_5xx": 0,
    "duracion_total_ms": 0.0,
}

_CAMPOS = (
    "evento",
    "request_id",
    "metodo",
    "ruta",
    "estado",
    "duracion_ms",
    "usuario_id",
)


class JsonFormatter(logging.Formatter):
    """Convierte cada registro en un objeto JSON de una sola línea."""

    def format(self, record: logging.LogRecord) -> str:
        datos: dict[str, Any] = {
            "ts": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(timespec="milliseconds"),
            "nivel": record.levelname,
            "logger": record.name,
            "mensaje": record.getMessage(),
        }
        for campo in _CAMPOS:
            if hasattr(record, campo):
                datos[campo] = getattr(record, campo)
        if record.exc_info:
            datos["excepcion"] = self.formatException(record.exc_info)
        return json.dumps(datos, ensure_ascii=False, default=str)


def instantanea() -> dict[str, Any]:
    """Copia consistente de los contadores para el health detallado."""
    with _bloqueo:
        total = _contadores["peticiones"]
        return {
            "peticiones": total,
            "por_metodo": dict(_contadores["por_metodo"]),
            "por_estado": dict(_contadores["por_estado"]),
            "errores_5xx": _contadores["errores_5xx"],
            "duracion_promedio_ms": round(
                _contadores["duracion_total_ms"] / total, 1
            ) if total else 0.0,
            "desde_inicio_del_proceso": True,
        }


def registrar(
    metodo: str,
    ruta: str,
    estado: int,
    duracion_ms: float,
    request_id: str,
    usuario_id: str | None = None,
) -> None:
    """Actualiza métricas y emite la línea estructurada."""
    with _bloqueo:
        _contadores["peticiones"] += 1
        _contadores["por_metodo"][metodo] = (
            _contadores["por_metodo"].get(metodo, 0) + 1
        )
        clave_estado = str(estado)
        _contadores["por_estado"][clave_estado] = (
            _contadores["por_estado"].get(clave_estado, 0) + 1
        )
        if estado >= 500:
            _contadores["errores_5xx"] += 1
        _contadores["duracion_total_ms"] += duracion_ms

    logger.info(
        "peticion_api",
        extra={
            "evento": "peticion_api",
            "request_id": request_id,
            "metodo": metodo,
            "ruta": ruta,
            "estado": estado,
            "duracion_ms": round(duracion_ms, 1),
            "usuario_id": usuario_id,
        },
    )


class RequestObservabilityMiddleware:
    """Añade ``X-Request-ID`` y registra método, ruta, estado y latencia."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        inicio = time.perf_counter()
        request.request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        estado = 500
        try:
            respuesta = self.get_response(request)
            estado = respuesta.status_code
            respuesta["X-Request-ID"] = request.request_id
            return respuesta
        finally:
            duracion_ms = (time.perf_counter() - inicio) * 1000
            resolver_match = getattr(request, "resolver_match", None)
            ruta = getattr(resolver_match, "route", None) or request.path
            usuario = getattr(request, "user", None)
            usuario_id = None
            if usuario is not None and getattr(usuario, "is_authenticated", False):
                usuario_id = str(getattr(usuario, "pk", ""))
            registrar(
                request.method,
                ruta,
                estado,
                duracion_ms,
                request.request_id,
                usuario_id,
            )
