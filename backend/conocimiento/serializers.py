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
    # Vector pgvector de 1536 dims: solo escritura, nunca en lectura.
    embedding = serializers.ListField(
        child=serializers.FloatField(),
        min_length=1536,
        max_length=1536,
        write_only=True,
    )

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
