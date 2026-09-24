from rest_framework import serializers

from .models import FragmentoDocumental, FuenteDocumental


class FuenteDocumentalSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuenteDocumental
        fields = [
            "id_fuente",
            "atractivo",
            "titulo",
            "url",
            "tipo",
            "fecha_actualizacion",
            "fecha_creacion",
        ]
        read_only_fields = ["id_fuente", "fecha_creacion"]


class FragmentoDocumentalSerializer(serializers.ModelSerializer):
    fuente_titulo = serializers.CharField(source="fuente.titulo", read_only=True)

    class Meta:
        model = FragmentoDocumental
        fields = [
            "id_fragmento",
            "fuente",
            "fuente_titulo",
            "numero_fragmento",
            "contenido",
            "embedding",
            "fecha_creacion",
        ]
        read_only_fields = ["id_fragmento", "fecha_creacion"]
        # El vector de 1536 dims nunca se expone en lectura (payload
        # pesado y dato interno del motor de búsqueda); solo escritura.
        extra_kwargs = {"embedding": {"required": True, "write_only": True}}
