from django.contrib.gis.geos import Point
from drf_spectacular.utils import extend_schema_field
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
        # Replica el CHECK ck_usuario_preferencia_nivel (0–1) para
        # responder 400 en vez de escalar a 500 por IntegrityError.
        extra_kwargs = {"nivel_interes": {"min_value": 0, "max_value": 1}}


@extend_schema_field(
    {
        "type": "object",
        "properties": {
            "coordinates": {
                "type": "array",
                "items": {"type": "number"},
                "minItems": 2,
                "maxItems": 2,
            }
        },
        "required": ["coordinates"],
        "example": {"coordinates": [-68.1486, -16.4966]},
    }
)
class PuntoPartidaField(serializers.Field):
    """Punto de partida: acepta {coordinates: [lon, lat]} y lo deja
    pasar para que create/update lo conviertan a Point 4326;
    en lectura serializa el Point como WKT."""

    def to_representation(self, value) -> str:
        return str(value)

    def to_internal_value(self, data):
        try:
            lon, lat = data["coordinates"]
            return {"coordinates": [float(lon), float(lat)]}
        except (KeyError, TypeError, ValueError) as exc:
            raise serializers.ValidationError(
                "punto_partida debe ser {coordinates: [lon, lat]}."
            ) from exc


class ConsultaRecomendacionSerializer(serializers.ModelSerializer):
    punto_partida = PuntoPartidaField()

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
        # Replica los CHECK ck_consulta_presupuesto (>= 0) y
        # ck_consulta_tiempo (> 0) para responder 400 en vez de 500.
        extra_kwargs = {"presupuesto_bob": {"min_value": 0}}

    def validate_tiempo_horas(self, value):
        if value <= 0:
            raise serializers.ValidationError("tiempo_horas debe ser mayor a 0.")
        return value

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
