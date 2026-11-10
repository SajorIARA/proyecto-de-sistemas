"""Manejador central de excepciones de la API.

Convierte en respuestas HTTP acotadas las excepciones de Django que DRF no
conoce y que, de otro modo, escapan hasta el middleware y devuelven un 500
con página de debug (o HTML en producción).

Trazas:
- ``django.core.exceptions.ValidationError`` (full_clean de modelos)   -> 400
- ``django.db.utils.IntegrityError`` (CHECK/FK/UNIQUE de BD)          -> 409
- ``django.db.models.ProtectedError`` (DELETE con FK en uso)          -> 409

Reproduce previamente (2026-10-21) con los hallazgos #13/#14/#14b/#14c/#14f/#15.
"""

from __future__ import annotations

import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def _detail(exc: DjangoValidationError) -> dict:
    """Devuelve un dict JSON-friendly desde una ValidationError de Django."""
    if hasattr(exc, "message_dict"):
        return exc.message_dict
    messages = exc.messages if hasattr(exc, "messages") else [str(exc)]
    return {"detail": messages}


def api_exception_handler(exc, context):
    """DRF handler + mapeo de errores Django -> 400/409 (nunca 500)."""
    response = exception_handler(exc, context)
    if response is not None:
        return response  # ya era una APIException de DRF (401/403/404/...)

    if isinstance(exc, DjangoValidationError):
        logger.warning("ValidationError de Django en %s: %s", context, exc)
        return Response(_detail(exc), status=status.HTTP_400_BAD_REQUEST)

    if isinstance(exc, IntegrityError):
        # No filtrar el texto de la BD (expone nombres de tablas/columnas).
        logger.exception("IntegrityError en %s", context)
        return Response(
            {"detail": "Conflicto de integridad con la base de datos."},
            status=status.HTTP_409_CONFLICT,
        )

    if isinstance(exc, ProtectedError):
        logger.warning("ProtectedError en %s", context)
        return Response(
            {"detail": "El registro está en uso y no puede eliminarse."},
            status=status.HTTP_409_CONFLICT,
        )

    return None  # desconocido -> lo maneja DRF (500)
