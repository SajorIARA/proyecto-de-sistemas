"""Catálogo público de turismo (lectura): categorías, tarifas, horarios,
atractivos con filtros (issue #18), búsqueda geoespacial y facetas."""

from django.contrib.gis.db.models.functions import Distance, Transform
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db.models import Avg, Count, Max, Min
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from usuarios.permissions import IsAdminOrReadOnly

from .filters import AtractivoFilter
from .models import Atractivo, Categoria, Horario, Tarifa, TipoTarifa
from .serializers import (
    AtractivoSerializer,
    CategoriaSerializer,
    HorarioSerializer,
    TarifaSerializer,
    TipoTarifaSerializer,
)


class CategoriaViewSet(ModelViewSet):
    """CRUD categorías. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = CategoriaSerializer
    queryset = Categoria.objects.all().order_by("nombre")

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action in ("list", "retrieve"):
            return queryset.filter(activo=True)

        return queryset

    def perform_destroy(self, instance):
        """Da de baja la categoría sin eliminarla físicamente."""
        instance.activo = False
        instance.save(update_fields=["activo"])


class TipoTarifaViewSet(ModelViewSet):
    """CRUD tipos de tarifa. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = TipoTarifaSerializer
    queryset = TipoTarifa.objects.all().order_by("nombre")


class HorarioViewSet(ModelViewSet):
    """CRUD horarios. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = HorarioSerializer
    queryset = Horario.objects.select_related("atractivo").all()


class TarifaViewSet(ModelViewSet):
    """CRUD tarifas. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = TarifaSerializer
    queryset = Tarifa.objects.select_related("atractivo", "tipo_tarifa").all()


class AtractivoViewSet(ReadOnlyModelViewSet):
    """Catálogo público de atractivos (solo lectura).

    Filtros combinables (ver :class:`turismo.filters.AtractivoFilter`,
    pensados para buscador con debounce). Ej:
    ``/api/turismo/atractivos/?q=museo&categoria=Cultura&precio_max=50``.
    """

    permission_classes = [AllowAny]
    serializer_class = AtractivoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AtractivoFilter

    def get_queryset(self):
        return (
            Atractivo.objects.filter(activo=True)
            .prefetch_related("categorias", "fotos")
            .order_by("nombre")
            .distinct()
        )

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "lat",
                float,
                OpenApiParameter.QUERY,
                required=True,
                description="Latitud del punto de referencia.",
            ),
            OpenApiParameter(
                "lon",
                float,
                OpenApiParameter.QUERY,
                required=True,
                description="Longitud del punto de referencia.",
            ),
            OpenApiParameter(
                "radio",
                float,
                OpenApiParameter.QUERY,
                required=False,
                description="Radio en metros (defecto 2000, máximo 50000).",
            ),
        ],
        description="Atractivos activos dentro del radio, ordenados por "
        "distancia. Cada item incluye distancia_m.",
    )
    @action(detail=False, methods=["get"], url_path="cercanos")
    def cercanos(self, request):
        """GET /api/turismo/atractivos/cercanos/?lat=&lon=&radio= (metros).

        Búsqueda espacial: atractivos activos dentro del radio indicado
        del punto dado, ordenados por distancia ascendente. Cada item
        incluye ``distancia_m``. Distancias calculadas en metros con
        proyección UTM 19S (La Paz).
        """
        try:
            lat = float(request.query_params["lat"])
            lon = float(request.query_params["lon"])
        except (KeyError, TypeError, ValueError):
            return Response({"detail": "Se requieren lat y lon numéricos."}, status=400)
        if not -90 <= lat <= 90 or not -180 <= lon <= 180:
            return Response(
                {"detail": "lat debe estar en [-90, 90] y lon en [-180, 180]."},
                status=400,
            )
        try:
            radio = float(request.query_params.get("radio", 2000))
        except (TypeError, ValueError):
            return Response({"detail": "radio debe ser numérico (metros)."}, status=400)
        if not 0 < radio <= 50000:
            return Response(
                {"detail": "radio debe estar en (0, 50000] metros."}, status=400
            )
        punto = Point(lon, lat, srid=4326)
        punto_utm = punto.transform(32719, clone=True)
        queryset = (
            Atractivo.objects.filter(activo=True)
            .prefetch_related("categorias", "fotos")
            .annotate(distancia=Distance(Transform("ubicacion", 32719), punto_utm))
            .filter(distancia__lte=D(m=radio))
            .order_by("distancia")
        )
        pagina = self.paginate_queryset(queryset)
        if pagina is not None:
            datos = self.get_serializer(pagina, many=True).data
            for item, obj in zip(datos, pagina):
                item["distancia_m"] = round(obj.distancia.m, 1)
            return self.get_paginated_response(datos)
        datos = self.get_serializer(queryset, many=True).data
        for item, obj in zip(datos, queryset):
            item["distancia_m"] = round(obj.distancia.m, 1)
        return Response(datos)

    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Facetas para el panel de filtros: categorías con "
        "conteo de atractivos activos y rango de precios BOB.",
    )
    @action(detail=False, methods=["get"], url_path="facetas")
    def facetas(self, request):
        """GET /api/turismo/atractivos/facetas/ — opciones del panel."""
        activos = Atractivo.objects.filter(activo=True)
        categorias = list(
            Categoria.objects.filter(atractivos__activo=True)
            .annotate(total=Count("atractivos"))
            .order_by("nombre")
            .values("id_categoria", "nombre", "total")
        )
        precios = Tarifa.objects.filter(atractivo__activo=True).aggregate(
            min=Min("monto"), max=Max("monto"), promedio=Avg("monto")
        )
        return Response(
            {
                "total_atractivos": activos.count(),
                "categorias": categorias,
                "precios_bob": {
                    "min": precios["min"],
                    "max": precios["max"],
                    "promedio": precios["promedio"],
                },
            }
        )
