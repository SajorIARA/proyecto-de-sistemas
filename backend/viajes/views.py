"""API REST de viajes personales.

El usuario se toma siempre del token: nunca se acepta un ``usuario`` en el
cuerpo y todas las consultas se filtran por el usuario autenticado.
"""

from __future__ import annotations

import uuid

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import ParadaViaje, Viaje
from .permissions import filtrar_viajes_propios
from .serializers import (
    ViajeCreateSerializer,
    ViajeSerializer,
    ViajeUpdateSerializer,
    VisitaParadaSerializer,
)

PARAMETRO_ID = OpenApiParameter(
    "id", uuid.UUID, OpenApiParameter.PATH, description="UUID del viaje."
)
PARAMETRO_PARADA = OpenApiParameter(
    "parada_id", int, OpenApiParameter.PATH, description="ID de la parada."
)


def _reemplazar_paradas(viaje: Viaje, ids_atractivo: list[uuid.UUID]) -> None:
    """Sustituye todas las paradas conservando el estado de visita previo."""

    anteriores = {parada.atractivo_id: parada for parada in viaje.paradas.all()}
    ParadaViaje.objects.filter(viaje=viaje).delete()
    ParadaViaje.objects.bulk_create(
        [
            ParadaViaje(
                viaje=viaje,
                atractivo_id=id_atractivo,
                orden=orden,
                visitada=(
                    anteriores[id_atractivo].visitada
                    if id_atractivo in anteriores
                    else False
                ),
                visitada_en=(
                    anteriores[id_atractivo].visitada_en
                    if id_atractivo in anteriores
                    else None
                ),
            )
            for orden, id_atractivo in enumerate(ids_atractivo)
        ]
    )


@extend_schema(
    parameters=[PARAMETRO_ID],
    tags=["viajes"],
)
@extend_schema_view(
    list=extend_schema(
        operation_id="viajes_listar",
        responses={status.HTTP_200_OK: ViajeSerializer(many=True)},
        description="Lista únicamente los viajes del usuario autenticado.",
    ),
    retrieve=extend_schema(
        operation_id="viajes_detallar",
        responses={
            status.HTTP_200_OK: ViajeSerializer,
            status.HTTP_404_NOT_FOUND: OpenApiResponse(
                description="Viaje inexistente."
            ),
        },
    ),
    destroy=extend_schema(
        operation_id="viajes_eliminar",
        responses={status.HTTP_204_NO_CONTENT: None},
    ),
)
class ViajeViewSet(ModelViewSet):
    """CRUD de viajes propios con acciones de estado y seguimiento."""

    permission_classes = [IsAuthenticated]
    serializer_class = ViajeSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        viajes = (
            Viaje.objects.select_related("usuario")
            .prefetch_related("paradas__atractivo")
            .all()
        )
        return filtrar_viajes_propios(viajes, self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return ViajeCreateSerializer
        if self.action == "partial_update":
            return ViajeUpdateSerializer
        if self.action == "marcar_visitada":
            return VisitaParadaSerializer
        return ViajeSerializer

    def _respuesta(self, viaje: Viaje, codigo: int = status.HTTP_200_OK) -> Response:
        """Serializa el estado fresco del viaje después de una mutación."""

        viaje.refresh_from_db()
        return Response(
            ViajeSerializer(viaje, context=self.get_serializer_context()).data,
            status=codigo,
        )

    @extend_schema(
        operation_id="viajes_crear",
        request=ViajeCreateSerializer,
        responses={
            status.HTTP_201_CREATED: ViajeSerializer,
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(
                description="Payload inválido o atractivo inexistente."
            ),
        },
        description=(
            "Crea el viaje y sus paradas en una sola transacción. El usuario "
            "se asigna desde el token JWT; `paradas` es una lista de UUID de "
            "atractivos en el orden deseado."
        ),
    )
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        entrada = ViajeCreateSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data
        viaje = Viaje.objects.create(usuario=request.user, nombre=datos["nombre"])
        _reemplazar_paradas(viaje, datos["paradas"])
        return self._respuesta(viaje, status.HTTP_201_CREATED)

    @extend_schema(
        operation_id="viajes_actualizar",
        request=ViajeUpdateSerializer,
        responses={
            status.HTTP_200_OK: ViajeSerializer,
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(
                description="Payload inválido o atractivo inexistente."
            ),
        },
        description=(
            "Actualiza `nombre` y/o reemplaza las paradas. Si se envían "
            "paradas, se conserva `visitada` y `visitada_en` de los atractivos "
            "que ya estaban presentes."
        ),
    )
    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        viaje = self.get_object()
        entrada = ViajeUpdateSerializer(data=request.data, partial=True)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data
        if "nombre" in datos:
            viaje.nombre = datos["nombre"]
            viaje.save(update_fields=["nombre", "actualizado_en"])
        if "paradas" in datos:
            _reemplazar_paradas(viaje, datos["paradas"])
        return self._respuesta(viaje)

    @extend_schema(
        operation_id="viajes_iniciar",
        request=None,
        responses={status.HTTP_200_OK: ViajeSerializer},
        description=(
            "Marca el viaje como `en_curso`. Llamadas repetidas son inofensivas."
        ),
    )
    @action(detail=True, methods=["post"], url_path="iniciar")
    def iniciar(self, request, pk=None):
        viaje = self.get_object()
        if viaje.estado != Viaje.Estado.EN_CURSO or viaje.iniciado_en is None:
            viaje.estado = Viaje.Estado.EN_CURSO
            viaje.iniciado_en = viaje.iniciado_en or timezone.now()
            viaje.finalizado_en = None
            viaje.save(
                update_fields=[
                    "estado",
                    "iniciado_en",
                    "finalizado_en",
                    "actualizado_en",
                ]
            )
        return self._respuesta(viaje)

    @extend_schema(
        operation_id="viajes_finalizar",
        request=None,
        responses={status.HTTP_200_OK: ViajeSerializer},
        description=(
            "Marca el viaje como `finalizado`. Llamadas repetidas son inofensivas."
        ),
    )
    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        viaje = self.get_object()
        if viaje.estado != Viaje.Estado.FINALIZADO or viaje.finalizado_en is None:
            viaje.estado = Viaje.Estado.FINALIZADO
            viaje.finalizado_en = viaje.finalizado_en or timezone.now()
            viaje.save(update_fields=["estado", "finalizado_en", "actualizado_en"])
        return self._respuesta(viaje)

    @extend_schema(
        operation_id="viajes_marcar_visitada",
        parameters=[PARAMETRO_PARADA],
        request=VisitaParadaSerializer,
        responses={
            status.HTTP_200_OK: ViajeSerializer,
            status.HTTP_404_NOT_FOUND: OpenApiResponse(
                description="Parada inexistente."
            ),
        },
        description=(
            "Marca (o desmarca) una parada del viaje y devuelve el viaje "
            "completo. `visitada` defaults a `true` cuando se omite el cuerpo."
        ),
    )
    @action(
        detail=True,
        methods=["post"],
        url_path=r"paradas/(?P<parada_id>[0-9]+)/visitada",
        url_name="marcar-visitada",
    )
    def marcar_visitada(self, request, pk=None, parada_id=None):
        viaje = self.get_object()
        parada = get_object_or_404(ParadaViaje, viaje=viaje, pk=parada_id)
        entrada = VisitaParadaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        visitada = entrada.validated_data["visitada"]
        parada.visitada = visitada
        parada.visitada_en = timezone.now() if visitada else None
        parada.save(update_fields=["visitada", "visitada_en"])
        return self._respuesta(viaje)
