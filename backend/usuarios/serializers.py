from __future__ import annotations

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.models import Rol, Usuario


class LogoutSerializer(serializers.Serializer):
    """Body de logout: el refresh a invalidar."""

    refresh = serializers.CharField()


class PasswordChangeSerializer(serializers.Serializer):
    """Cambio de contraseña autenticado con validación completa."""

    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        usuario = self.context["request"].user
        if not usuario.check_password(attrs["current_password"]):
            raise serializers.ValidationError(
                {"current_password": ["La contraseña actual es incorrecta."]}
            )
        if attrs["new_password"] != attrs.get("new_password_confirm"):
            raise serializers.ValidationError(
                {"new_password_confirm": ["Las contraseñas nuevas no coinciden."]}
            )
        try:
            validate_password(attrs["new_password"], usuario)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": exc.messages}) from exc
        return attrs


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


class RegisterSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.get("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": ["Las contraseñas no coinciden."]}
            )
        try:
            validate_password(attrs["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        if Usuario.objects.filter(email__iexact=attrs["email"]).exists():
            raise serializers.ValidationError(
                {"email": ["Ya existe un usuario con este email."]}
            )
        return attrs

    def create(
        self, validated_data: dict
    ) -> tuple[Usuario, RefreshToken, RefreshToken]:
        password = validated_data.pop("password")
        validated_data.pop("password_confirm")
        with transaction.atomic():
            usuario = Usuario.objects.create_user(
                email=validated_data["email"],
                password=password,
                nombre=validated_data["nombre"],
            )
            rol_turista, _ = Rol.objects.get_or_create(
                codigo="TOURIST",
                defaults={
                    "nombre": "Turista",
                    "descripcion": "Usuario visitante de la plataforma",
                },
            )
            usuario.roles.add(rol_turista)
        refresh = RefreshToken.for_user(usuario)
        return usuario, refresh, refresh.access_token
