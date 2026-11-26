"""Trazado de recorridos con OSRM.

El frontend dibuja una línea recta entre paradas cuando no hay servicio de
ruteo; este endpoint reemplaza esa línea por la geometría real de calles. Si
OSRM falla, devuelve 503 y el frontend rotula su trazado como *aproximado*:
nunca se presenta una línea recta como si fuera un recorrido computado.
"""

from __future__ import annotations

import json
import logging
import socket
import urllib.error
import urllib.request
from urllib.parse import quote

from django.conf import settings
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class PuntoRuteoSerializer(serializers.Serializer):
    latitud = serializers.FloatField(min_value=-90, max_value=90)
    longitud = serializers.FloatField(min_value=-180, max_value=180)


class RuteoRequestSerializer(serializers.Serializer):
    puntos = PuntoRuteoSerializer(many=True)

    def validate_puntos(self, puntos: list[dict]) -> list[dict]:
        if len(puntos) < 2:
            raise serializers.ValidationError("Se necesitan al menos dos puntos.")
        if len(puntos) > settings.RUTEO_MAX_PUNTOS:
            raise serializers.ValidationError(
                f"El máximo es {settings.RUTEO_MAX_PUNTOS} puntos por recorrido."
            )
        return puntos


class RuteoResponseSerializer(serializers.Serializer):
    origen = serializers.CharField()
    distancia_km = serializers.FloatField()
    duracion_minutos = serializers.FloatField()
    trazado = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField())
    )


class RuteoView(APIView):
    """POST /api/turismo/ruteo/ — ruta real entre paradas, en orden."""

    permission_classes = [AllowAny]

    @extend_schema(
        request=RuteoRequestSerializer,
        responses={
            200: RuteoResponseSerializer,
            400: OpenApiResponse(description="Puntos inválidos."),
            502: OpenApiResponse(description="OSRM devolvió una respuesta inválida."),
            503: OpenApiResponse(description="Ruteo no configurado o no disponible."),
        },
        description=(
            "Pide a OSRM la geometría de calles entre las paradas. "
            "El trazado se devuelve como pares [latitud, longitud]."
        ),
        tags=["turismo"],
        auth=[],
    )
    def post(self, request):
        if not settings.RUTEO_URL:
            return Response(
                {"detail": "El servicio de ruteo no está configurado."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        entrada = RuteoRequestSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        puntos = entrada.validated_data["puntos"]
        coordenadas = ";".join(
            f"{punto['longitud']},{punto['latitud']}" for punto in puntos
        )
        url = (
            f"{settings.RUTEO_URL}/route/v1/driving/"
            f"{quote(coordenadas, safe=',;')}"
            "?overview=full&geometries=geojson"
        )

        try:
            peticion = urllib.request.Request(
                url,
                headers={"User-Agent": settings.SCRAPER_USER_AGENT},
                method="GET",
            )
            with urllib.request.urlopen(
                peticion, timeout=settings.RUTEO_TIMEOUT_SECONDS
            ) as respuesta:
                datos = json.loads(respuesta.read().decode("utf-8"))
        except (
            urllib.error.URLError,
            socket.timeout,
            TimeoutError,
            OSError,
            ValueError,
        ):
            logger.warning("Ruteo: OSRM no disponible al pedir la ruta.")
            return Response(
                {"detail": "El servicio de ruteo no está disponible."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not isinstance(datos, dict):
            logger.warning("Ruteo: respuesta inválida de OSRM.")
            return Response(
                {"detail": "El servicio de ruteo devolvió una respuesta inválida."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        ruta = (datos.get("routes") or [None])[0]
        geometria = (ruta or {}).get("geometry") or {}
        coords = geometria.get("coordinates")
        if (
            datos.get("code") != "Ok"
            or not isinstance(ruta, dict)
            or not isinstance(coords, list)
            or len(coords) < 2
            or not isinstance(ruta.get("distance"), (int, float))
            or not isinstance(ruta.get("duration"), (int, float))
            or not all(
                isinstance(par, (list, tuple)) and len(par) == 2 for par in coords
            )
        ):
            logger.warning("Ruteo: respuesta inválida de OSRM.")
            return Response(
                {"detail": "El servicio de ruteo devolvió una respuesta inválida."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payload = {
            "origen": "osrm",
            # OSRM entrega metros y segundos.
            "distancia_km": round(ruta["distance"] / 1000, 2),
            "duracion_minutos": round(ruta["duration"] / 60, 1),
            "trazado": [[lat, lon] for lon, lat in coords],
        }
        return Response(RuteoResponseSerializer(payload).data)
