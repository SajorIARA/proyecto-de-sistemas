from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.viewsets import ModelViewSet

from .models import ConsultaRecomendacion, UsuarioPreferencia
from .serializers import (
    ConsultaRecomendacionSerializer,
    UsuarioPreferenciaSerializer,
)


class UsuarioPreferenciaViewSet(ModelViewSet):
    """CRUD preferencias de usuario. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = UsuarioPreferenciaSerializer
    queryset = UsuarioPreferencia.objects.select_related("usuario", "categoria").all()


class ConsultaRecomendacionViewSet(ModelViewSet):
    """CRUD consultas de recomendación. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = ConsultaRecomendacionSerializer
    queryset = ConsultaRecomendacion.objects.select_related("usuario").all()
