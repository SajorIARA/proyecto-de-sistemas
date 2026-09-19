from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import Atractivo
from .serializers import AtractivoSerializer


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
