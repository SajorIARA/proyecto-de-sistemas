"""Sondeo de salud con dependencias (base de datos y asistente RAG).

``/api/health/`` se mantiene liviano para los balanceadores. Este endpoint
añade señales para operación: comprueba la BD con ``SELECT 1`` y la
alcanzabilidad del servidor Ollama con una conexión TCP breve (sin invocar al
modelo, para no encarecer el chequeo).
"""

from __future__ import annotations

import logging
import socket
from urllib.parse import urlparse

from django.conf import settings
from django.db import connection
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .observability import instantanea

logger = logging.getLogger("observabilidad")


def _estado_rag() -> dict:
    """Configuración y alcance de Ollama, sin exponer credenciales ni modelo."""
    url = urlparse(settings.OLLAMA_BASE_URL)
    puerto = url.port or (443 if url.scheme == "https" else 80)
    resultado: dict = {
        "configurado": bool(url.hostname),
        "host": url.hostname or None,
        "alcance": False,
    }
    if not url.hostname:
        return resultado

    try:
        with socket.create_connection((url.hostname, puerto), timeout=0.5):
            resultado["alcance"] = True
    except (OSError, ValueError) as exc:
        logger.info(
            "rag_no_alcanzable",
            extra={
                "evento": "rag_no_alcanzable",
                "host": url.hostname,
                "error": type(exc).__name__,
            },
        )
    return resultado


@extend_schema(
    auth=[],
    responses={
        200: OpenApiTypes.OBJECT,
        503: OpenApiResponse(description="Alguna dependencia no está disponible."),
    },
    description=(
        "Salud detallada: base de datos, alcance del servidor del asistente "
        "y métricas mínimas del proceso (se reinician al reiniciar)."
    ),
    tags=["sistema"],
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health_detallado(request):
    degradado: list[str] = []

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        estado_db: dict = {"estado": "ok"}
    except Exception as exc:  # base de datos caída: reportar, no derribar
        logger.warning(
            "db_no_disponible",
            extra={"evento": "db_no_disponible", "error": type(exc).__name__},
        )
        estado_db = {"estado": "error", "detalle": type(exc).__name__}
        degradado.append("db")

    estado_rag = _estado_rag()
    if not estado_rag["alcance"]:
        degradado.append("rag")

    payload = {
        "status": "degradado" if degradado else "ok",
        "service": "backend",
        "checks": {"db": estado_db, "rag": estado_rag},
        "degradado": degradado,
        "metricas": instantanea(),
    }
    codigo = status.HTTP_503_SERVICE_UNAVAILABLE if degradado else status.HTTP_200_OK
    return Response(payload, status=codigo)
