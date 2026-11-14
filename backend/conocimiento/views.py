from __future__ import annotations

import logging

from django.conf import settings
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from usuarios.permissions import IsAdminOrReadOnly

from .models import FragmentoDocumental, FuenteDocumental
from .ollama import ClienteOllama, OllamaError, OllamaNoDisponible
from .rag import recuperar_fragmentos, responder_con_contexto
from .serializers import (
    ConsultaRAGSerializer,
    FragmentoDocumentalSerializer,
    FuenteDocumentalSerializer,
    RespuestaRAGSerializer,
)
from .throttles import RAGAnonRateThrottle, RAGUserRateThrottle

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(auth=[]),
    retrieve=extend_schema(auth=[]),
)
class FuenteDocumentalViewSet(ModelViewSet):
    """CRUD fuentes documentales. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = FuenteDocumentalSerializer
    queryset = FuenteDocumental.objects.select_related("atractivo").all()


@extend_schema_view(
    list=extend_schema(auth=[]),
    retrieve=extend_schema(auth=[]),
)
class FragmentoDocumentalViewSet(ModelViewSet):
    """CRUD fragmentos documentales. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = FragmentoDocumentalSerializer
    queryset = FragmentoDocumental.objects.select_related("fuente").all()


class ConsultaRAGView(APIView):
    """Asistente RAG público: recupera contexto y responde con citas.

    El guard de contexto vacío vive en :func:`conocimiento.rag.responder_con_contexto`:
    si pgvector no devuelve fragmentos, se responde la negativa estándar sin
    invocar al modelo. Así una caída o una alucinación del LLM no puede
    convertir una pregunta sin fuentes en una respuesta inventada.
    """

    permission_classes = [AllowAny]
    throttle_classes = [RAGAnonRateThrottle, RAGUserRateThrottle]

    @extend_schema(
        request=ConsultaRAGSerializer,
        responses={
            200: RespuestaRAGSerializer,
            400: OpenApiResponse(description="Pregunta o parámetros inválidos."),
            429: OpenApiResponse(description="Demasiadas consultas."),
            502: OpenApiResponse(description="Ollama devolvió una respuesta inválida."),
            503: OpenApiResponse(description="El asistente no está disponible."),
        },
        description=(
            "Recupera fragmentos por similitud coseno y responde solo con el "
            "contexto encontrado. Si no hay contexto, devuelve una negativa "
            "estándar sin invocar al modelo."
        ),
        tags=["conocimiento"],
        auth=[],
    )
    def post(self, request):
        entrada = ConsultaRAGSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data

        try:
            cliente = ClienteOllama()
            vector = cliente.embeddings([datos["pregunta"]])[0]
        except OllamaNoDisponible:
            logger.warning("RAG: Ollama no disponible al generar el embedding.")
            return Response(
                {"detail": "El asistente no está disponible en este momento."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except OllamaError:
            logger.exception(
                "RAG: respuesta inválida de Ollama al generar el embedding."
            )
            return Response(
                {"detail": "El asistente devolvió una respuesta inválida."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ValueError:
            logger.exception("RAG: configuración de Ollama inválida.")
            return Response(
                {"detail": "El asistente no está configurado correctamente."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            recuperacion = recuperar_fragmentos(
                vector,
                fuente_id=datos.get("id_fuente"),
                atractivo_id=datos.get("id_atractivo"),
                top_k=datos["top_k"],
            )
        except ValueError:
            logger.exception("RAG: parámetros de recuperación inválidos.")
            return Response(
                {"detail": "No se pudo procesar la consulta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            respuesta = responder_con_contexto(
                cliente, datos["pregunta"], recuperacion.fragmentos
            )
        except OllamaNoDisponible:
            logger.warning("RAG: Ollama no disponible al generar la respuesta.")
            return Response(
                {"detail": "El asistente no está disponible en este momento."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except OllamaError:
            logger.exception("RAG: respuesta inválida de Ollama al generar el texto.")
            return Response(
                {"detail": "El asistente devolvió una respuesta inválida."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payload = {
            "respuesta": respuesta,
            "citas": [
                {
                    "id_fragmento": fragmento.id_fragmento,
                    "id_fuente": fragmento.fuente_id,
                    "titulo": fragmento.fuente_titulo,
                    "url": fragmento.fuente_url,
                    "numero_fragmento": fragmento.numero_fragmento,
                    "distancia": round(fragmento.distancia, 4),
                }
                for fragmento in recuperacion.fragmentos
            ],
            "recuperados": len(recuperacion.fragmentos),
            "modelo": settings.OLLAMA_LLM_MODEL,
            "generado_en": timezone.now(),
        }
        return Response(RespuestaRAGSerializer(payload).data)
