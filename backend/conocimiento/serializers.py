from django.conf import settings
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
            "hash_contenido",
            "estado_scraping",
            "fecha_creacion",
        ]
        read_only_fields = [
            "id_fuente",
            "hash_contenido",
            "estado_scraping",
            "fecha_creacion",
        ]


class FragmentoDocumentalSerializer(serializers.ModelSerializer):
    fuente_titulo = serializers.CharField(source="fuente.titulo", read_only=True)
    # Vector pgvector: solo escritura, nunca en lectura.
    embedding = serializers.ListField(
        child=serializers.FloatField(),
        min_length=settings.EMBEDDING_DIM,
        max_length=settings.EMBEDDING_DIM,
        write_only=True,
        required=False,
        allow_null=True,
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
            "embedding_modelo",
            "embedding_dimension",
            "embedding_actualizado",
            "fecha_creacion",
        ]
        read_only_fields = [
            "id_fragmento",
            "embedding_modelo",
            "embedding_dimension",
            "embedding_actualizado",
            "fecha_creacion",
        ]
