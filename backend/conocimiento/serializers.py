from django.conf import settings
from rest_framework import serializers

from .fuentes_abiertas import FUENTES_DISPONIBLES, validar_ciudad
from .models import (
    FragmentoDocumental,
    FuenteDocumental,
    ImportacionLugares,
    LugarCandidato,
)


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
    """Contrato de salida del asistente.

    `origen` declara de forma explícita que el texto proviene de la
    documentación recuperada. El frontend usa este campo para distinguir
    respuestas RAG de sus degradaciones locales (catálogo o estimaciones).
    """

    origen = serializers.CharField(
        help_text="Procedencia de la respuesta; este endpoint devuelve siempre «rag»."
    )
    respuesta = serializers.CharField()
    citas = CitaRAGSerializer(many=True)
    recuperados = serializers.IntegerField()
    modelo = serializers.CharField()
    generado_en = serializers.DateTimeField()


class CrearImportacionSerializer(serializers.Serializer):
    """Cuerpo para iniciar una búsqueda en fuentes abiertas."""

    consulta = serializers.CharField(min_length=3, max_length=120, trim_whitespace=True)
    ciudad = serializers.CharField(max_length=100, default="La Paz")
    fuentes = serializers.ListField(
        child=serializers.ChoiceField(choices=FUENTES_DISPONIBLES),
        default=lambda: list(FUENTES_DISPONIBLES),
        allow_empty=False,
    )
    limite = serializers.IntegerField(
        min_value=1, max_value=settings.FUENTES_ABIERTAS_MAX_LIMITE, default=20
    )

    def validate_ciudad(self, valor: str) -> str:
        validar_ciudad(valor)
        return valor


class ImportacionLugaresSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportacionLugares
        fields = [
            "id_importacion",
            "consulta",
            "ciudad",
            "fuentes",
            "estado",
            "error",
            "encontrados",
            "candidatos_creados",
            "duplicados",
            "estado_vectorizacion",
            "error_vectorizacion",
            "vectorizado_en",
            "fecha_creacion",
            "fecha_actualizacion",
        ]
        read_only_fields = fields


class LugarCandidatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LugarCandidato
        fields = [
            "id_candidato",
            "importacion",
            "fuente",
            "id_externo",
            "hash_contenido",
            "nombre",
            "descripcion",
            "categoria_sugerida",
            "categoria",
            "latitud",
            "longitud",
            "direccion",
            "horario_declarado",
            "sitio_web",
            "url_fuente",
            "licencia",
            "duracion_minutos",
            "estado",
            "atractivo",
            "notas_revision",
            "fecha_creacion",
        ]
        read_only_fields = fields


class AprobarCandidatoSerializer(serializers.Serializer):
    """Datos que el administrador debe completar antes de publicar."""

    categoria = serializers.CharField(max_length=100, trim_whitespace=True)
    duracion_minutos = serializers.IntegerField(min_value=1, max_value=10080)


class RechazarCandidatoSerializer(serializers.Serializer):
    notas = serializers.CharField(
        max_length=2000,
        trim_whitespace=True,
        required=False,
        allow_blank=True,
        default="",
    )


class ResultadoAprobacionSerializer(serializers.Serializer):
    id_atractivo = serializers.UUIDField()
    id_fuente = serializers.UUIDField()
    fragmentos = serializers.IntegerField()
    actualizado = serializers.BooleanField()
    vectorizacion_encolada = serializers.BooleanField()
    estado_vectorizacion = serializers.CharField()


class ResultadoVectorizacionSerializer(serializers.Serializer):
    id_importacion = serializers.UUIDField()
    estado = serializers.CharField()
    fuentes = serializers.IntegerField()
    mensaje = serializers.CharField()
