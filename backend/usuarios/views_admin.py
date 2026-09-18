from __future__ import annotations

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.models import Usuario
from usuarios.permissions import IsAdmin
from usuarios.serializers import UsuarioListSerializer


class UsuarioAdminPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class UsuariosAdminView(APIView):
    """GET /api/auth/usuarios/ — lista paginada de usuarios (solo ADMIN).

    Requiere JWT + rol ADMIN. La lista paginada permite al administrador
    gestionar usuarios de la plataforma.
    """

    permission_classes = [IsAdmin]
    pagination_class = UsuarioAdminPagination

    def get(self, request):
        usuarios = (
            Usuario.objects.prefetch_related("roles").all().order_by("-fecha_creacion")
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(usuarios, request)
        serializer = UsuarioListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
