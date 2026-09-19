from django.contrib.gis.geos import Point
from rest_framework import serializers

from .models import Atractivo


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
            "activo",
        ]

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
