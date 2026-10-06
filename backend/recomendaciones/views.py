from rest_framework.viewsets import ModelViewSet

from recomendaciones.permissions import IsAuthenticatedOwnerOrAdmin

from .models import ConsultaRecomendacion, UsuarioPreferencia
from .serializers import (
    ConsultaRecomendacionSerializer,
    UsuarioPreferenciaSerializer,
)


def _es_admin(usuario) -> bool:
    return usuario.roles.filter(codigo="ADMIN").exists()


class UsuarioPreferenciaViewSet(ModelViewSet):
    """CRUD preferencias. Autenticados ven lo propio; ADMIN todo y escribe."""

    permission_classes = [IsAuthenticatedOwnerOrAdmin]
    serializer_class = UsuarioPreferenciaSerializer

    def get_queryset(self):
        base = UsuarioPreferencia.objects.select_related("usuario", "categoria").all()
        if _es_admin(self.request.user):
            return base
        return base.filter(usuario=self.request.user)


class ConsultaRecomendacionViewSet(ModelViewSet):
    """CRUD consultas. Autenticados ven lo propio; ADMIN todo y escribe."""

    permission_classes = [IsAuthenticatedOwnerOrAdmin]
    serializer_class = ConsultaRecomendacionSerializer

    def get_queryset(self):
        base = ConsultaRecomendacion.objects.select_related("usuario").all()
        if _es_admin(self.request.user):
            return base
        return base.filter(usuario=self.request.user)
