from rest_framework.viewsets import ModelViewSet

from usuarios.permissions import IsAdminOrReadOnly

from .models import FragmentoDocumental, FuenteDocumental
from .serializers import FragmentoDocumentalSerializer, FuenteDocumentalSerializer


class FuenteDocumentalViewSet(ModelViewSet):
    """CRUD fuentes documentales. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = FuenteDocumentalSerializer
    queryset = FuenteDocumental.objects.select_related("atractivo").all()


class FragmentoDocumentalViewSet(ModelViewSet):
    """CRUD fragmentos documentales. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = FragmentoDocumentalSerializer
    queryset = FragmentoDocumental.objects.select_related("fuente").all()
