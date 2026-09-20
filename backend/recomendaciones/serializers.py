from django.contrib.gis.geos import Point
from rest_framework import serializers

from .models import ConsultaRecomendacion, UsuarioPreferencia


class UsuarioPreferenciaSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source="categoria.nombre", read_only=True)

    class Meta:
        model = UsuarioPreferencia
        fields = [
            "id",
            "usuario",
            "categoria",
            "categoria_nombre",
            "nivel_interes",
            "fecha_registro",
        ]
        read_only_fields = ["id", "fecha_registro"]


class ConsultaRecomendacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultaRecomendacion
        fields = [
            "id_consulta",
            "usuario",
            "presupuesto_bob",
            "tiempo_horas",
            "punto_partida",
            "macrodistrito",
            "fecha_consulta",
        ]
        read_only_fields = ["id_consulta", "fecha_consulta"]

    def create(self, validated_data):
        coords = validated_data.pop("punto_partida", None)
        if isinstance(coords, dict):
            coords = Point(
                coords["coordinates"][0],
                coords["coordinates"][1],
                srid=4326,
            )
        validated_data["punto_partida"] = coords
        return super().create(validated_data)

    def update(self, instance, validated_data):
        coords = validated_data.pop("punto_partida", None)
        if coords is not None and isinstance(coords, dict):
            coords = Point(
                coords["coordinates"][0],
                coords["coordinates"][1],
                srid=4326,
            )
            validated_data["punto_partida"] = coords
        return super().update(instance, validated_data)
