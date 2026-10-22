import uuid

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from recomendaciones.permissions import IsAuthenticatedOwnerOrAdmin
from usuarios.permissions import es_admin

from .models import ConsultaRecomendacion, UsuarioPreferencia
from .serializers import (
    ConsultaRecomendacionSerializer,
    MiPreferenciaSerializer,
    UsuarioPreferenciaSerializer,
)


@extend_schema(
    # El lookup del router es `pk` sin tipar: sin esto spectacular no
    # infiere el tipo del path parameter y publica "string".
    parameters=[
        OpenApiParameter("id", int, OpenApiParameter.PATH, description="PK.")
    ]
)
class UsuarioPreferenciaViewSet(ModelViewSet):
    """CRUD preferencias. Autenticados ven lo propio; ADMIN todo y escribe."""

    permission_classes = [IsAuthenticatedOwnerOrAdmin]
    serializer_class = UsuarioPreferenciaSerializer

    def get_queryset(self):
        base = UsuarioPreferencia.objects.select_related("usuario", "categoria").all()
        if es_admin(self.request.user):
            return base
        return base.filter(usuario=self.request.user)


@extend_schema(
    # PK del modelo: UUID (id_consulta), sin tipar en la ruta.
    parameters=[
        OpenApiParameter(
            "id", uuid.UUID, OpenApiParameter.PATH, description="UUID."
        )
    ]
)
class ConsultaRecomendacionViewSet(ModelViewSet):
    """CRUD consultas. Autenticados ven lo propio; ADMIN todo y escribe."""

    permission_classes = [IsAuthenticatedOwnerOrAdmin]
    serializer_class = ConsultaRecomendacionSerializer

    def get_queryset(self):
        base = ConsultaRecomendacion.objects.select_related("usuario").all()
        if es_admin(self.request.user):
            return base
        return base.filter(usuario=self.request.user)


@extend_schema(
    # Mismo PK que UsuarioPreferencia (BigAutoField) sin tipar en la ruta.
    parameters=[
        OpenApiParameter("id", int, OpenApiParameter.PATH, description="PK.")
    ]
)
class MisPreferenciasViewSet(ModelViewSet):
    """Preferencias del usuario autenticado (issue #22).

    GET lista las propias, POST crea asignando el JWT, PATCH/DELETE solo
    sobre las propias. Nunca expone ni acepta otro usuario.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MiPreferenciaSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return UsuarioPreferencia.objects.select_related("usuario", "categoria").filter(
            usuario=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)
