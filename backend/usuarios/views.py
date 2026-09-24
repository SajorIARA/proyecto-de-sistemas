from __future__ import annotations

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
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

from usuarios.serializers import (
    LogoutSerializer,
    PasswordChangeSerializer,
    RegisterSerializer,
)
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

    @extend_schema(
        request=TokenObtainPairSerializer,
        responses={200: OpenApiTypes.OBJECT},
        description="Login con {email, password}. Retorna access+refresh "
        "planos y el usuario con sus roles.",
    )
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

    @extend_schema(
        request=RegisterSerializer,
        responses={201: OpenApiTypes.OBJECT},
        description="Registro público. Crea el usuario con hash PBKDF2, "
        "asigna el rol TOURIST y retorna tokens.",
    )
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

    @extend_schema(
        request=LogoutSerializer,
        responses={204: None},
        description="Logout: invalida el refresh token (blacklist).",
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except (TokenError, TokenBackendError):
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

    @extend_schema(
        request=TokenRefreshSerializer,
        responses={200: OpenApiTypes.OBJECT},
        description="Renovación de access con {refresh}. Retorna {access}.",
    )
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

    @extend_schema(
        request=PasswordChangeSerializer,
        responses={200: OpenApiTypes.OBJECT},
        description="Cambio de contraseña del usuario autenticado.",
    )
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        usuario = request.user
        usuario.set_password(serializer.validated_data["new_password"])
        usuario.save(update_fields=["password", "fecha_actualizacion"])
        return Response({"detail": "Contraseña actualizada correctamente."})
