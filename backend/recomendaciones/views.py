import uuid

from django.contrib.gis.geos import Point
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from recomendaciones.permissions import IsAuthenticatedOwnerOrAdmin
from usuarios.permissions import es_admin

from .models import ConsultaRecomendacion, UsuarioPreferencia
from .serializers import (
    ConsultaRecomendacionSerializer,
    MiPreferenciaSerializer,
    RecomendacionRequestSerializer,
    RecomendacionResponseSerializer,
    UsuarioPreferenciaSerializer,
)
from .services import recomendar


@extend_schema(
    # El lookup del router es `pk` sin tipar: sin esto spectacular no
    # infiere el tipo del path parameter y publica "string".
    parameters=[OpenApiParameter("id", int, OpenApiParameter.PATH, description="PK.")]
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
        OpenApiParameter("id", uuid.UUID, OpenApiParameter.PATH, description="UUID.")
    ]
)
class ConsultaRecomendacionViewSet(ModelViewSet):
    """Consultas del usuario autenticado (issue #22/#27).

    Cualquier usuario autenticado crea y gestiona **sus** consultas; el
    ``usuario`` se toma del JWT (nunca del body). ADMIN ve todas.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ConsultaRecomendacionSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        base = ConsultaRecomendacion.objects.select_related("usuario").all()
        if es_admin(self.request.user):
            return base
        return base.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


@extend_schema(
    # Mismo PK que UsuarioPreferencia (BigAutoField) sin tipar en la ruta.
    parameters=[OpenApiParameter("id", int, OpenApiParameter.PATH, description="PK.")]
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


class RecomendarView(APIView):
    """Motor de recomendación multicriterio (issue #27).

    ``POST /api/recommendations/`` (alias ``/api/recomendaciones/recomendar/``)
    recibe el perfil del turista, persiste la consulta y devuelve el Top-K
    ordenado de forma determinista. Los filtros duros se aplican en la base
    de datos: costo BOB <= presupuesto y distancia esférica <= radio.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=RecomendacionRequestSerializer,
        responses={status.HTTP_200_OK: RecomendacionResponseSerializer},
        description=(
            "Calcula el ranking Top-K de destinos viables. El costo se "
            "compara contra la tarifa mínima vigente en BOB y la distancia "
            "se calcula con ST_DistanceSphere. Si no se envían "
            "``preferencias``, se usan las del usuario autenticado."
        ),
    )
    def post(self, request):
        entrada = RecomendacionRequestSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data

        preferencias = datos.get("preferencias")
        if preferencias is None:
            preferencias = {
                preferencia.categoria.nombre: preferencia.nivel_interes
                for preferencia in UsuarioPreferencia.objects.filter(
                    usuario=request.user,
                    categoria__activo=True,
                ).select_related("categoria")
            }

        lon, lat = datos["punto_partida"]["coordinates"]
        punto = Point(lon, lat, srid=4326)
        resultado = recomendar(
            presupuesto_bob=datos["presupuesto_bob"],
            tiempo_horas=datos["tiempo_horas"],
            punto_partida=punto,
            radio_km=datos["radio_km"],
            top_k=datos["top_k"],
            preferencias=preferencias,
        )
        consulta = ConsultaRecomendacion.objects.create(
            usuario=request.user,
            presupuesto_bob=datos["presupuesto_bob"],
            tiempo_horas=datos["tiempo_horas"],
            punto_partida=punto,
            macrodistrito=datos.get("macrodistrito") or None,
        )

        items = [
            {
                "id_atractivo": recomendacion.puntuacion.id_atractivo,
                "nombre": recomendacion.puntuacion.nombre,
                "puntaje": recomendacion.puntuacion.puntaje,
                "afinidad_categoria": recomendacion.puntuacion.afinidad_categoria,
                "proximidad": recomendacion.puntuacion.proximidad,
                "holgura_presupuesto": recomendacion.puntuacion.holgura_presupuesto,
                "holgura_tiempo": recomendacion.puntuacion.holgura_tiempo,
                "distancia_km": recomendacion.puntuacion.distancia_km,
                "factor_penalizacion": recomendacion.puntuacion.factor_penalizacion,
                "viable": recomendacion.puntuacion.viable,
                "motivos": list(recomendacion.puntuacion.motivos),
                "categorias": list(recomendacion.categorias),
                "costo_bob": recomendacion.costo_bob,
                "duracion_horas": float(recomendacion.duracion_horas),
                "latitud": recomendacion.latitud,
                "longitud": recomendacion.longitud,
            }
            for recomendacion in resultado.recomendaciones
        ]
        payload = {
            "id_consulta": consulta.id_consulta,
            "generado_en": timezone.now(),
            "total_activos": resultado.total_activos,
            "total_evaluados": resultado.total_evaluados,
            "total_recomendaciones": len(items),
            "radio_km": resultado.radio_km,
            "top_k": resultado.top_k,
            "recomendaciones": items,
        }
        return Response(RecomendacionResponseSerializer(payload).data)
