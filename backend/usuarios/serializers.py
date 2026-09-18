from __future__ import annotations

from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.models import Rol, Usuario


class LoginSerializer(TokenObtainPairSerializer):
    """Valida {email, password} contra el modelo Usuario (USERNAME_FIELD=email)
    y devuelve access+refresh. El shape flat {access, refresh} lo normaliza
    normalizeTokens() del frontend."""


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
                defaults={"nombre": "Turista", "descripcion": "Usuario visitante de la plataforma"},
            )
            usuario.roles.add(rol_turista)
        refresh = RefreshToken.for_user(usuario)
        return usuario, refresh, refresh.access_token
