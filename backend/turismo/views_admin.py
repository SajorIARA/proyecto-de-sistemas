"""Administración del catálogo (solo ADMIN): destinos y fotos."""

import uuid

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.viewsets import ModelViewSet

from usuarios.permissions import IsAdmin

from .models import Atractivo, Foto
from .serializers import AtractivoAdminSerializer, FotoSerializer


class AtractivoAdminViewSet(ModelViewSet):
    """CRUD de destinos turísticos. Solo usuarios con rol ADMIN.

    Endpoints (bajo /api/turismo/admin/atractivos/):
    POST crear · GET listar/detalle · PUT/PATCH actualizar ·
    DELETE baja lógica (activo=false, preserva relacionados).
    Las coordenadas se reciben como {longitud, latitud} y se persisten
    como Point SRID 4326 en PostGIS.
    """

    permission_classes = [IsAdmin]
    serializer_class = AtractivoAdminSerializer
    queryset = (
        Atractivo.objects.prefetch_related("categorias", "fotos")
        .all()
        .order_by("nombre")
    )

    def perform_destroy(self, instance: Atractivo) -> None:
        """Baja lógica (issue #20): marca inactivo en vez de borrar.

        Preserva horarios, tarifas y fuentes relacionadas (FK CASCADE /
        SET NULL no se disparan) y mantiene el historial del destino.
        """
        instance.activo = False
        instance.save(update_fields=["activo", "fecha_actualizacion"])


class FotoAdminViewSet(ModelViewSet):
    """CRUD de fotos de destinos. Solo ADMIN."""

    permission_classes = [IsAdmin]
    serializer_class = FotoSerializer
    queryset = (
        Foto.objects.select_related("atractivo")
        .all()
        .order_by("atractivo", "orden", "id_foto")
    )

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "atractivo",
                str,
                OpenApiParameter.QUERY,
                required=False,
                description="UUID del atractivo; filtra sus fotos.",
            ),
        ],
        description="Fotos de un destino (o todas si se omite `atractivo`).",
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        atractivo = self.request.query_params.get("atractivo")
        if not atractivo:
            return queryset
        try:
            # Un UUID mal formado haría estallar el filtro con un 500; se
            # devuelve el queryset sin resultados en su lugar.
            uuid.UUID(atractivo)
        except (ValueError, TypeError):
            return queryset.none()
        return queryset.filter(atractivo_id=atractivo)
