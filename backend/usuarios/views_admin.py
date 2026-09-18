from __future__ import annotations

from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.models import Usuario
from usuarios.permissions import IsAdmin


class UsuarioListSerializer(serializers.ModelSerializer):
    roles = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field="codigo",
    )

    class Meta:
        model = Usuario
        fields = [
            "id_usuario",
            "email",
            "nombre",
            "activo",
            "fecha_creacion",
            "roles",
        ]
        read_only_fields = fields


class UsuariosAdminView(APIView):
    """GET /api/auth/usuarios/ — lista de usuarios (solo ADMIN).

    Requiere JWT + rol ADMIN. La lista paginada permite al administrador
    gestionar usuarios de la plataforma.
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        usuarios = Usuario.objects.prefetch_related("roles").all().order_by(
            "-fecha_creacion"
        )
        serializer = UsuarioListSerializer(usuarios, many=True)
        return Response(serializer.data)
