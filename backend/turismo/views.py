from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from usuarios.permissions import IsAdmin, IsAdminOrReadOnly

from .models import Atractivo, Categoria, Horario, Tarifa, TipoTarifa
from .serializers import (
    AtractivoAdminSerializer,
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


class AtractivoAdminViewSet(ModelViewSet):
    """CRUD de destinos turísticos. Solo usuarios con rol ADMIN.

    Endpoints (bajo /api/turismo/admin/atractivos/):
    POST crear · GET listar/detalle · PUT/PATCH actualizar · DELETE eliminar.
    Las coordenadas se reciben como {longitud, latitud} y se persisten
    como Point SRID 4326 en PostGIS.
    """

    permission_classes = [IsAdmin]
    serializer_class = AtractivoAdminSerializer
    queryset = Atractivo.objects.prefetch_related("categorias").all().order_by("nombre")
