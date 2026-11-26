"""Exportación y baja con anonimización de datos personales.

La baja conserva las filas históricas (consultas, preferencias y viajes)
para no romper integridad referencial, pero sustituye los identificadores
personales y desactiva la cuenta. Los tokens pendientes se eliminan para que
no queden sesiones válidas después de la baja.
"""

from __future__ import annotations

import uuid

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from .models import Usuario

CONFIRMACION = "ANONIMIZAR"


class ConfirmacionBajaSerializer(serializers.Serializer):
    confirmacion = serializers.CharField()

    def validate_confirmacion(self, valor: str) -> str:
        if valor.strip().upper() != CONFIRMACION:
            raise serializers.ValidationError(
                f"Escriba exactamente {CONFIRMACION} para confirmar la baja."
            )
        return valor.strip().upper()


@extend_schema(
    responses={200: OpenApiTypes.OBJECT},
    description=(
        "Devuelve los datos personales del usuario en sesión y el historial "
        "que le pertenece. Nunca incluye la contraseña ni hashes."
    ),
    tags=["cuenta"],
)
class MisDatosView(APIView):
    """GET /api/auth/mis-datos/ — exportación legible de los propios datos."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario: Usuario = request.user

        from recomendaciones.models import ConsultaRecomendacion, UsuarioPreferencia

        preferencias = list(
            UsuarioPreferencia.objects.filter(usuario=usuario)
            .select_related("categoria")
            .values_list("categoria__nombre", "nivel_interes")
        )
        consultas = list(
            ConsultaRecomendacion.objects.filter(usuario=usuario).values(
                "id_consulta",
                "presupuesto_bob",
                "tiempo_horas",
                "macrodistrito",
                "fecha_consulta",
            )
        )
        viajes: list[dict] = []
        try:
            from viajes.models import Viaje

            viajes = [
                {
                    "id_viaje": str(viaje.id_viaje),
                    "nombre": viaje.nombre,
                    "estado": viaje.estado,
                    "creado_en": viaje.creado_en.isoformat(),
                    "paradas": viaje.paradas.count(),
                }
                for viaje in Viaje.objects.filter(usuario=usuario)
            ]
        except ImportError:
            # La app de viajes es opcional en despliegues antiguos.
            pass

        payload = {
            "id_usuario": str(usuario.id_usuario),
            "email": usuario.email,
            "nombre": usuario.nombre,
            "activo": usuario.activo,
            "fecha_creacion": usuario.fecha_creacion.isoformat(),
            "roles": list(usuario.roles.values_list("codigo", flat=True)),
            "preferencias": [
                {"categoria": categoria, "nivel_interes": float(nivel)}
                for categoria, nivel in preferencias
            ],
            "consultas": [
                {
                    **consulta,
                    "id_consulta": str(consulta["id_consulta"]),
                    "presupuesto_bob": str(consulta["presupuesto_bob"]),
                    "fecha_consulta": consulta["fecha_consulta"].isoformat(),
                }
                for consulta in consultas
            ],
            "viajes": viajes,
        }
        return Response(payload)


@extend_schema(
    request=ConfirmacionBajaSerializer,
    responses={
        200: OpenApiTypes.OBJECT,
        400: OpenApiResponse(description="Confirmación incorrecta."),
    },
    description=(
        "Anonimiza la cuenta y la da de baja. Conserva el historial sin "
        "datos personales; revoca los tokens pendientes."
    ),
    tags=["cuenta"],
)
class AnonimizarMisDatosView(APIView):
    """POST /api/auth/mis-datos/anonimizar/ — baja con anonimización."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        entrada = ConfirmacionBajaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        usuario: Usuario = request.user
        usuario.email = f"anonimizado-{uuid.uuid4().hex[:12]}@invalid.example"
        usuario.nombre = "Usuario anonimizado"
        usuario.activo = False
        usuario.set_unusable_password()
        usuario.save(
            update_fields=[
                "email",
                "nombre",
                "activo",
                "password",
                "fecha_actualizacion",
            ]
        )
        usuario.roles.clear()
        OutstandingToken.objects.filter(user=usuario).delete()

        return Response(
            {
                "detail": (
                    "Tus datos personales fueron anonimizados y la cuenta dada de baja. "
                    "El historial sin identificadores personales se conserva."
                ),
                "activo": False,
            },
            status=status.HTTP_200_OK,
        )
