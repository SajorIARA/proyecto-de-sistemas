from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenBackendError, TokenError
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.serializers import RegisterSerializer
from usuarios.throttles import AuthRateThrottle


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
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
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
    throttle_classes = [AuthRateThrottle]

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
        except (TokenError, TokenBackendError, KeyError, TypeError):
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
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, TokenBackendError):
            return Response(
                {"detail": "refresh token inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response({"access": serializer.validated_data["access"]})


class PasswordChangeView(APIView):
    """POST /api/auth/password/change/ — cambio de contraseña autenticado.

    Body {current_password, new_password, new_password_confirm} → 200.
    Requiere JWT válido; valida la contraseña actual con el hash PBKDF2
    y exige mínimo 8 caracteres en la nueva.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = request.user
        actual = request.data.get("current_password")
        nueva = request.data.get("new_password")
        confirmacion = request.data.get("new_password_confirm")
        if not actual or not nueva or not confirmacion:
            return Response(
                {
                    "detail": "Se requieren current_password, new_password "
                    "y new_password_confirm."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not usuario.check_password(actual):
            return Response(
                {"detail": "La contraseña actual es incorrecta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if nueva != confirmacion:
            return Response(
                {"detail": "Las contraseñas nuevas no coinciden."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(nueva) < 8:
            return Response(
                {"detail": "La nueva contraseña debe tener al menos 8 caracteres."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        usuario.set_password(nueva)
        usuario.save(update_fields=["password", "fecha_actualizacion"])
        return Response({"detail": "Contraseña actualizada correctamente."})
