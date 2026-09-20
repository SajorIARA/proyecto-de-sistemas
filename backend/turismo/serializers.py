from django.contrib.gis.geos import Point
from rest_framework import serializers

from .models import (
    Atractivo,
    Categoria,
    Horario,
    Tarifa,
    TipoTarifa,
)


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id_categoria", "nombre", "descripcion", "activo"]
        read_only_fields = ["id_categoria"]


class TipoTarifaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoTarifa
        fields = ["id_tipo_tarifa", "codigo", "nombre", "descripcion"]
        read_only_fields = ["id_tipo_tarifa"]


class HorarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Horario
        fields = [
            "id_horario",
            "atractivo",
            "dia_semana",
            "hora_apertura",
            "hora_cierre",
            "cerrado",
            "vigente_desde",
            "vigente_hasta",
        ]
        read_only_fields = ["id_horario"]


class TarifaSerializer(serializers.ModelSerializer):
    tipo_tarifa_nombre = serializers.CharField(
        source="tipo_tarifa.nombre", read_only=True
    )

    class Meta:
        model = Tarifa
        fields = [
            "id_tarifa",
            "atractivo",
            "tipo_tarifa",
            "tipo_tarifa_nombre",
            "monto",
            "moneda",
            "vigente_desde",
            "vigente_hasta",
            "observacion",
        ]
        read_only_fields = ["id_tarifa"]


class AtractivoSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="id_atractivo", read_only=True)
    categorias = serializers.SerializerMethodField()
    ubicacion = serializers.SerializerMethodField()
    area = serializers.SerializerMethodField()

    class Meta:
        model = Atractivo
        fields = [
            "id",
            "nombre",
            "descripcion",
            "direccion",
            "duracion_minutos",
            "ubicacion",
            "area",
            "categorias",
            "fuente_origen",
            "activo",
            "fecha_creacion",
            "fecha_actualizacion",
        ]
        read_only_fields = ["id", "fecha_creacion", "fecha_actualizacion"]

    def get_categorias(self, obj: Atractivo) -> list[str]:
        return [
            categoria.nombre for categoria in obj.categorias.all() if categoria.activo
        ]

    def get_ubicacion(self, obj: Atractivo) -> dict[str, float]:
        point: Point = obj.ubicacion
        return {"longitud": point.x, "latitud": point.y}

    def get_area(self, obj: Atractivo) -> object | None:
        if obj.area is None:
            return None
        return obj.area.coords
