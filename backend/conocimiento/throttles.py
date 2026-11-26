from __future__ import annotations

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class RAGAnonRateThrottle(AnonRateThrottle):
    """Límite por IP para el asistente RAG público."""

    scope = "rag_anon"


class RAGUserRateThrottle(UserRateThrottle):
    """Límite por usuario autenticado para el asistente RAG."""

    scope = "rag_user"
