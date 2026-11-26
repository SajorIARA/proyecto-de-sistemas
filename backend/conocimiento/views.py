from __future__ import annotations

import logging

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from usuarios.permissions import IsAdmin, IsAdminOrReadOnly

from .models import (
    FragmentoDocumental,
    FuenteDocumental,
    ImportacionLugares,
    LugarCandidato,
)
from .ollama import ClienteOllama, OllamaError, OllamaNoDisponible
from .rag import (
    recuperar_fragmentos,
    resolver_atractivo_en_pregunta,
    responder_con_contexto,
)
from .serializers import (
    AprobarCandidatoSerializer,
    ConsultaRAGSerializer,
    CrearImportacionSerializer,
    FragmentoDocumentalSerializer,
    FuenteDocumentalSerializer,
    ImportacionLugaresSerializer,
    LugarCandidatoSerializer,
    RechazarCandidatoSerializer,
    RespuestaRAGSerializer,
    ResultadoAprobacionSerializer,
    ResultadoVectorizacionSerializer,
)
from .services import (
    aprobar_lugar_candidato,
    encolar_importacion,
    encolar_vectorizacion,
    rechazar_lugar_candidato,
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
        if not datos.get("id_fuente") and not datos.get("id_atractivo"):
            atractivo = resolver_atractivo_en_pregunta(datos["pregunta"])
            if atractivo:
                datos["id_atractivo"] = atractivo

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
            "origen": "rag",
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


class ImportacionesAdminView(APIView):
    """Lista y crea importaciones desde fuentes abiertas. Solo ADMIN."""

    permission_classes = [IsAdmin]

    @extend_schema(
        responses={200: ImportacionLugaresSerializer(many=True)},
        description="Devuelve las últimas importaciones, más recientes primero.",
        tags=["conocimiento-admin"],
    )
    def get(self, request):
        queryset = ImportacionLugares.objects.all()[:50]
        return Response(ImportacionLugaresSerializer(queryset, many=True).data)

    @extend_schema(
        request=CrearImportacionSerializer,
        responses={
            202: ImportacionLugaresSerializer,
            400: OpenApiResponse(description="Parámetros de búsqueda inválidos."),
            503: OpenApiResponse(description="No se pudo encolar la importación."),
        },
        description=(
            "Crea la importación en estado «pendiente» y encola la consulta a "
            "Overpass y Wikidata en el backend. Consultar el detalle o el listado "
            "para seguir el progreso; los candidatos aparecen al completarse."
        ),
        tags=["conocimiento-admin"],
    )
    def post(self, request):
        entrada = CrearImportacionSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data
        importacion = ImportacionLugares.objects.create(
            consulta=datos["consulta"],
            ciudad=datos["ciudad"],
            fuentes=list(datos["fuentes"]),
            estado=ImportacionLugares.ESTADO_PENDIENTE,
        )
        encolada = encolar_importacion(
            importacion.id_importacion,
            consulta=datos["consulta"],
            ciudad=datos["ciudad"],
            fuentes=list(datos["fuentes"]),
            limite=datos["limite"],
        )
        if not encolada:
            return Response(
                {"detail": "No se pudo iniciar la importación en segundo plano."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            ImportacionLugaresSerializer(importacion).data,
            status=status.HTTP_202_ACCEPTED,
        )


class ImportacionAdminDetalleView(APIView):
    """Detalle de una importación, incluido el estado de vectorización."""

    permission_classes = [IsAdmin]

    @extend_schema(
        responses={200: ImportacionLugaresSerializer},
        tags=["conocimiento-admin"],
    )
    def get(self, request, id_importacion: str):
        importacion = get_object_or_404(ImportacionLugares, pk=id_importacion)
        return Response(ImportacionLugaresSerializer(importacion).data)


class CandidatosImportacionAdminView(APIView):
    """Candidatos de una importación para revisión administrativa."""

    permission_classes = [IsAdmin]

    @extend_schema(
        responses={200: LugarCandidatoSerializer(many=True)},
        tags=["conocimiento-admin"],
    )
    def get(self, request, id_importacion: str):
        get_object_or_404(ImportacionLugares, pk=id_importacion)
        candidatos = LugarCandidato.objects.filter(importacion_id=id_importacion)
        return Response(LugarCandidatoSerializer(candidatos, many=True).data)


class AprobarCandidatoAdminView(APIView):
    """Publica un candidato revisado en el catálogo y en el corpus RAG."""

    permission_classes = [IsAdmin]

    @extend_schema(
        request=AprobarCandidatoSerializer,
        responses={
            200: ResultadoAprobacionSerializer,
            400: OpenApiResponse(description="Faltan datos revisados por el admin."),
            409: OpenApiResponse(description="El candidato ya fue rechazado."),
        },
        tags=["conocimiento-admin"],
    )
    def post(self, request, id_candidato: str):
        candidato = get_object_or_404(LugarCandidato, pk=id_candidato)
        if candidato.estado == LugarCandidato.ESTADO_RECHAZADO:
            return Response(
                {"detail": "Un candidato rechazado no puede aprobarse."},
                status=status.HTTP_409_CONFLICT,
            )
        entrada = AprobarCandidatoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        try:
            resultado = aprobar_lugar_candidato(
                candidato,
                categoria=entrada.validated_data["categoria"],
                duracion_minutos=entrada.validated_data["duracion_minutos"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        importacion = ImportacionLugares.objects.get(pk=candidato.importacion_id)
        payload = {
            **{
                campo: getattr(resultado, campo)
                for campo in (
                    "id_atractivo",
                    "id_fuente",
                    "fragmentos",
                    "actualizado",
                    "vectorizacion_encolada",
                )
            },
            "estado_vectorizacion": importacion.estado_vectorizacion,
        }
        return Response(ResultadoAprobacionSerializer(payload).data)


class RechazarCandidatoAdminView(APIView):
    """Descarta un candidato sin publicarlo."""

    permission_classes = [IsAdmin]

    @extend_schema(
        request=RechazarCandidatoSerializer,
        responses={
            200: LugarCandidatoSerializer,
            409: OpenApiResponse(description="El candidato ya fue aprobado."),
        },
        tags=["conocimiento-admin"],
    )
    def post(self, request, id_candidato: str):
        candidato = get_object_or_404(LugarCandidato, pk=id_candidato)
        if candidato.estado == LugarCandidato.ESTADO_APROBADO:
            return Response(
                {"detail": "Un candidato aprobado no puede rechazarse."},
                status=status.HTTP_409_CONFLICT,
            )
        entrada = RechazarCandidatoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        candidato = rechazar_lugar_candidato(
            candidato, notas=entrada.validated_data["notas"]
        )
        return Response(LugarCandidatoSerializer(candidato).data)


class VectorizarImportacionAdminView(APIView):
    """Encola la vectorización de los fragmentos ya aprobados."""

    permission_classes = [IsAdmin]

    @extend_schema(
        request=None,
        responses={
            202: ResultadoVectorizacionSerializer,
            400: OpenApiResponse(description="No hay candidatos aprobados aún."),
        },
        description=(
            "Encola embeddings solo para fuentes aprobadas. Si Ollama falla, "
            "el estado pasa a «error»; nunca se simula éxito RAG."
        ),
        tags=["conocimiento-admin"],
    )
    def post(self, request, id_importacion: str):
        importacion = get_object_or_404(ImportacionLugares, pk=id_importacion)
        ids_atractivos = list(
            LugarCandidato.objects.filter(
                importacion=importacion,
                estado=LugarCandidato.ESTADO_APROBADO,
                atractivo__isnull=False,
            ).values_list("atractivo_id", flat=True)
        )
        fuentes = FuenteDocumental.objects.filter(
            atractivo_id__in=ids_atractivos, tipo="fuente_abierta"
        ).distinct()
        total = fuentes.count()
        if total == 0:
            return Response(
                {"detail": "Aprobá al menos un candidato antes de vectorizar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        importacion.estado_vectorizacion = ImportacionLugares.VECTORIZACION_PENDIENTE
        importacion.error_vectorizacion = ""
        importacion.save(update_fields=["estado_vectorizacion", "error_vectorizacion"])
        transaction.on_commit(lambda: encolar_vectorizacion(importacion.id_importacion))
        return Response(
            ResultadoVectorizacionSerializer(
                {
                    "id_importacion": importacion.id_importacion,
                    "estado": importacion.estado_vectorizacion,
                    "fuentes": total,
                    "mensaje": "Vectorización encolada.",
                }
            ).data,
            status=status.HTTP_202_ACCEPTED,
        )
