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


class ConsultaRAGSerializer(serializers.Serializer):
    """Pregunta y ámbito opcional para el asistente RAG."""

    pregunta = serializers.CharField(
        max_length=settings.RAG_MAX_PREGUNTA,
        trim_whitespace=True,
        allow_blank=False,
    )
    top_k = serializers.IntegerField(
        min_value=1, max_value=8, required=False, default=settings.RAG_TOP_K
    )
    id_fuente = serializers.UUIDField(required=False, allow_null=True)
    id_atractivo = serializers.UUIDField(required=False, allow_null=True)


class CitaRAGSerializer(serializers.Serializer):
    """Fragmento que respalda la respuesta, sin exponer el embedding."""

    id_fragmento = serializers.IntegerField()
    id_fuente = serializers.UUIDField()
    titulo = serializers.CharField()
    url = serializers.CharField(allow_blank=True)
    numero_fragmento = serializers.IntegerField()
    distancia = serializers.FloatField()


class RespuestaRAGSerializer(serializers.Serializer):
    """Contrato de salida del asistente."""

    respuesta = serializers.CharField()
    citas = CitaRAGSerializer(many=True)
    recuperados = serializers.IntegerField()
    modelo = serializers.CharField()
    generado_en = serializers.DateTimeField()
