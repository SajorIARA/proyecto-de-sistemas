from django.contrib.gis.db.models.functions import Distance, Transform
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from usuarios.permissions import IsAdminOrReadOnly

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
    """Catálogo público de atractivos (solo lectura)."""

    permission_classes = [AllowAny]
    serializer_class = AtractivoSerializer

    def get_queryset(self):
        queryset = (
            Atractivo.objects.filter(activo=True)
            .prefetch_related("categorias")
            .order_by("nombre")
        )
        query = self.request.query_params.get("q")
        if query:
            queryset = queryset.filter(Q(nombre__icontains=query))
        return queryset

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
            .prefetch_related("categorias")
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
