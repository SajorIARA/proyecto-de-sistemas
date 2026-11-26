"""Serializadores del contrato HTTP de viajes.

Se separa la representación de lectura (viaje completo, con paradas) de los
payloads de escritura (solo ``nombre`` y lista de UUID de atractivos).
"""

from __future__ import annotations

import uuid

from rest_framework import serializers

from turismo.models import Atractivo

from .models import ParadaViaje, Viaje


class ParadaViajeSerializer(serializers.ModelSerializer):
    """Parada ya persistida, con el nombre legible del atractivo."""

    id = serializers.IntegerField(source="id_parada", read_only=True)
    atractivo = serializers.UUIDField(source="atractivo_id", read_only=True)
    nombre = serializers.CharField(source="atractivo.nombre", read_only=True)

    class Meta:
        model = ParadaViaje
        fields = ["id", "atractivo", "nombre", "orden", "visitada", "visitada_en"]
        read_only_fields = fields


class ViajeSerializer(serializers.ModelSerializer):
    """Representación completa de un viaje, usada en todas las respuestas."""

    id = serializers.UUIDField(source="id_viaje", read_only=True)
    paradas = ParadaViajeSerializer(many=True, read_only=True)

    class Meta:
        model = Viaje
        fields = [
            "id",
            "nombre",
            "estado",
            "creado_en",
            "actualizado_en",
            "iniciado_en",
            "finalizado_en",
            "paradas",
        ]
        read_only_fields = fields


class _ParadasMixin:
    """Validación compartida de la lista de atractivos de las paradas."""

    def validate_paradas(self, value: list[uuid.UUID]) -> list[uuid.UUID]:
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "No se puede repetir un atractivo en las paradas del viaje."
            )
        existentes = set(
            Atractivo.objects.filter(id_atractivo__in=value).values_list(
                "id_atractivo", flat=True
            )
        )
        faltantes = [
            str(identificador)
            for identificador in value
            if identificador not in existentes
        ]
        if faltantes:
            raise serializers.ValidationError(
                f"No existe(n) atractivo(s) con id: {', '.join(faltantes)}."
            )
        return value


class ViajeCreateSerializer(_ParadasMixin, serializers.Serializer):
    """Payload de creación: ``nombre`` y paradas en el orden deseado."""

    nombre = serializers.CharField(max_length=150, allow_blank=False)
    paradas = serializers.ListField(
        child=serializers.UUIDField(),
        default=list,
        allow_empty=True,
    )


class ViajeUpdateSerializer(_ParadasMixin, serializers.Serializer):
    """Payload de PATCH: cualquier subconjunto de ``nombre`` y ``paradas``."""

    nombre = serializers.CharField(max_length=150, allow_blank=False, required=False)
    paradas = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )


class VisitaParadaSerializer(serializers.Serializer):
    """Cuerpo opcional de la acción de visita; por defecto marca como visitada."""

    visitada = serializers.BooleanField(default=True)
