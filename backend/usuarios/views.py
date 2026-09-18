from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.serializers import RegisterSerializer


class LoginView(APIView):
    """POST /api/auth/login/ — {email, password} -> flat {access, refresh}.

    Contrato JWT (issue #10 / DoD #88): credenciales inválidas → **400/401**,
    NUNCA 403. simplejwt lanza AuthenticationFailed al fallar el par; lo
    traducimos explícitamente a 401 Unauthorized (y 400 si el payload llega
    sin los campos obligatorios) para que el test del contrato
    (test_login_con_password_incorrecto → assertIn (400, 401)) quede verde.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        from rest_framework.exceptions import AuthenticationFailed

        serializer = TokenObtainPairSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except AuthenticationFailed:
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        usuario = serializer.user
        return Response(
            {
                "access": serializer.validated_data["access"],
                "refresh": serializer.validated_data["refresh"],
                "user": {
                    "id": usuario.id_usuario,
                    "email": usuario.email,
                    "nombre": usuario.nombre,
                    "roles": list(usuario.roles.values_list("codigo", flat=True)),
                },
            }
        )


class RegisterView(APIView):
    """POST /api/auth/register/ — activa la creación con hash PBKDF2 por defecto."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario, refresh, access = serializer.create(serializer.validated_data)
        return Response(
            {
                "tokens": {"access": str(access), "refresh": str(refresh)},
                "user": {
                    "id": usuario.id_usuario,
                    "email": usuario.email,
                    "nombre": usuario.nombre,
                    "roles": list(usuario.roles.values_list("codigo", flat=True)),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    """POST /api/auth/logout/ — body {refresh} → blacklist del refresh token.

    Contrato JWT (issue #10 / DoD): anula el refresh emitido en login para que
    no pueda reutilizarse tras el logout (token_blacklist ya aplicado en
    migrate). Devuelve 204 sin contenido.
    """

    authentication_classes = [JWTAuthentication]

    def post(self, request):
        try:
            refresh = request.data.get("refresh")
            RefreshToken(refresh).blacklist()
        except (TokenError, KeyError, TypeError):
            return Response(
                {"detail": "refresh token inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class TokenRefreshView(APIView):
    """POST /api/auth/token/refresh/ — body {refresh} -> flat {access}.

    Contrato JWT (issue #10 / DoD): la renovación de access es flat y directa
    (simplejwt 5.5.1 → {access}); refresh inválido/expirado → 401 (simplejwt
    devuelve InvalidToken→401 por defecto).
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            return Response(
                {"detail": "refresh token inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response({"access": serializer.validated_data["access"]})
