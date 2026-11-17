from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.viewsets import ModelViewSet

from usuarios.permissions import IsAdminOrReadOnly

from .models import FragmentoDocumental, FuenteDocumental
from .serializers import FragmentoDocumentalSerializer, FuenteDocumentalSerializer


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
