from __future__ import annotations

import uuid
from datetime import datetime

from django.contrib.gis.db import models
from pgvector.django import HnswIndex, VectorField

from turismo.models import Atractivo


class FuenteDocumental(models.Model):
    ESTADO_PENDIENTE = "pendiente"
    ESTADO_COMPLETADO = "completado"
    ESTADO_ERROR = "error"
    ESTADOS_SCRAPING = [
        (ESTADO_PENDIENTE, "Pendiente"),
        (ESTADO_COMPLETADO, "Completado"),
        (ESTADO_ERROR, "Error"),
    ]

    id_fuente: models.UUIDField[uuid.UUID, uuid.UUID] = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    atractivo: models.ForeignKey[Atractivo | None, Atractivo | None] = (
        models.ForeignKey(
            Atractivo,
            db_column="id_atractivo",
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            related_name="fuentes",
            db_index=False,
        )
    )
    titulo: models.CharField[str, str] = models.CharField(max_length=250)
    url: models.TextField[str | None, str | None] = models.TextField(
        null=True, blank=True
    )
    tipo: models.CharField[str | None, str | None] = models.CharField(
        max_length=50, null=True, blank=True
    )
    fecha_actualizacion: models.DateTimeField[datetime | None, datetime | None] = (
        models.DateTimeField(null=True, blank=True)
    )
    hash_contenido: models.CharField[str, str] = models.CharField(
        max_length=64, blank=True, default=""
    )
    estado_scraping: models.CharField[str, str] = models.CharField(
        max_length=20,
        choices=ESTADOS_SCRAPING,
        default=ESTADO_PENDIENTE,
    )
    error_scraping: models.TextField[str, str] = models.TextField(
        blank=True, default=""
    )
    fecha_creacion: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "fuente_documental"
        indexes = [
            models.Index(
                fields=["atractivo"],
                # SQL V2: idx_fuente_documental_atractivo (>30 → trunca)
                name="idx_fuente_doc_atractivo",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["url"],
                condition=models.Q(url__isnull=False),
                name="uq_fuente_documental_url",
            )
        ]

    def __str__(self) -> str:
        return self.titulo


class FragmentoDocumental(models.Model):
    id_fragmento: models.BigAutoField[int, int] = models.BigAutoField(primary_key=True)
    fuente: models.ForeignKey[FuenteDocumental, FuenteDocumental] = models.ForeignKey(
        FuenteDocumental,
        db_column="id_fuente",
        on_delete=models.CASCADE,
        related_name="fragmentos",
    )
    numero_fragmento: models.IntegerField[int, int] = models.IntegerField()
    contenido: models.TextField[str, str] = models.TextField()
    # El scraper crea primero los fragmentos. El embedding se completa en la
    # fase de vectorización; NULL evita almacenar vectores cero engañosos.
    embedding: VectorField = VectorField(dimensions=768, null=True, blank=True)
    embedding_modelo: models.CharField[str, str] = models.CharField(
        max_length=100, blank=True, default=""
    )
    embedding_dimension: models.PositiveSmallIntegerField[int | None, int | None] = (
        models.PositiveSmallIntegerField(null=True, blank=True)
    )
    embedding_actualizado: models.DateTimeField[datetime | None, datetime | None] = (
        models.DateTimeField(null=True, blank=True)
    )
    fecha_creacion: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "fragmento_documental"
        constraints = [
            models.CheckConstraint(
                check=models.Q(numero_fragmento__gte=0),
                name="ck_fragmento_numero",
            ),
            models.UniqueConstraint(
                fields=["fuente", "numero_fragmento"],
                name="uq_fragmento_fuente_numero",
            ),
        ]
        indexes = [
            HnswIndex(
                fields=["embedding"],
                name="idx_fragmento_embedding_hnsw",
                opclasses=["vector_cosine_ops"],
            )
        ]

    def __str__(self) -> str:
        return f"{self.fuente} · #{self.numero_fragmento}"


class ImportacionLugares(models.Model):
    """Lote de descubrimiento de lugares en fuentes abiertas.

    El estado de importación y el de vectorización son independientes: un
    lote puede descargarse correctamente y todavía no tener embeddings porque
    el administrador aún no aprobó ningún candidato.
    """

    ESTADO_PENDIENTE = "pendiente"
    ESTADO_COMPLETADO = "completado"
    ESTADO_ERROR = "error"
    ESTADOS = [
        (ESTADO_PENDIENTE, "Pendiente"),
        (ESTADO_COMPLETADO, "Completado"),
        (ESTADO_ERROR, "Error"),
    ]
    VECTORIZACION_SIN_APROBAR = "sin_vectorizar"
    VECTORIZACION_PENDIENTE = "pendiente"
    VECTORIZACION_COMPLETADO = "completado"
    VECTORIZACION_ERROR = "error"
    ESTADOS_VECTORIZACION = [
        (VECTORIZACION_SIN_APROBAR, "Sin vectorizar"),
        (VECTORIZACION_PENDIENTE, "Pendiente"),
        (VECTORIZACION_COMPLETADO, "Completado"),
        (VECTORIZACION_ERROR, "Error"),
    ]

    id_importacion: models.UUIDField[uuid.UUID, uuid.UUID] = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    consulta: models.CharField[str, str] = models.CharField(max_length=200)
    ciudad: models.CharField[str, str] = models.CharField(max_length=100)
    fuentes: models.JSONField = models.JSONField(default=list)
    estado: models.CharField[str, str] = models.CharField(
        max_length=20, choices=ESTADOS, default=ESTADO_PENDIENTE
    )
    error: models.TextField[str, str] = models.TextField(blank=True, default="")
    encontrados: models.PositiveIntegerField[int, int] = models.PositiveIntegerField(
        default=0
    )
    candidatos_creados: models.PositiveIntegerField[int, int] = (
        models.PositiveIntegerField(default=0)
    )
    duplicados: models.PositiveIntegerField[int, int] = models.PositiveIntegerField(
        default=0
    )
    estado_vectorizacion: models.CharField[str, str] = models.CharField(
        max_length=20,
        choices=ESTADOS_VECTORIZACION,
        default=VECTORIZACION_SIN_APROBAR,
    )
    error_vectorizacion: models.TextField[str, str] = models.TextField(
        blank=True, default=""
    )
    vectorizado_en: models.DateTimeField[datetime | None, datetime | None] = (
        models.DateTimeField(null=True, blank=True)
    )
    fecha_creacion: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        auto_now_add=True
    )
    fecha_actualizacion: models.DateTimeField[datetime, datetime] = (
        models.DateTimeField(auto_now=True)
    )

    class Meta:
        db_table = "importacion_lugares"
        ordering = ["-fecha_creacion"]

    def __str__(self) -> str:
        return f"{self.consulta} · {self.ciudad}"


class LugarCandidato(models.Model):
    """Lugar descubierto en una fuente abierta, pendiente de revisión admin."""

    ESTADO_PENDIENTE = "pendiente"
    ESTADO_APROBADO = "aprobado"
    ESTADO_RECHAZADO = "rechazado"
    ESTADOS = [
        (ESTADO_PENDIENTE, "Pendiente"),
        (ESTADO_APROBADO, "Aprobado"),
        (ESTADO_RECHAZADO, "Rechazado"),
    ]
    FUENTE_OVERPASS = "overpass"
    FUENTE_WIKIDATA = "wikidata"

    id_candidato: models.UUIDField[uuid.UUID, uuid.UUID] = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    importacion: models.ForeignKey[ImportacionLugares, ImportacionLugares] = (
        models.ForeignKey(
            ImportacionLugares,
            db_column="id_importacion",
            on_delete=models.CASCADE,
            related_name="candidatos",
            db_index=False,
        )
    )
    fuente: models.CharField[str, str] = models.CharField(max_length=30)
    id_externo: models.CharField[str, str] = models.CharField(max_length=200)
    hash_contenido: models.CharField[str, str] = models.CharField(
        max_length=64, blank=True, default=""
    )
    nombre: models.CharField[str, str] = models.CharField(max_length=200)
    descripcion: models.TextField[str, str] = models.TextField(blank=True, default="")
    categoria_sugerida: models.CharField[str, str] = models.CharField(
        max_length=100, blank=True, default=""
    )
    categoria: models.CharField[str, str] = models.CharField(
        max_length=100, blank=True, default=""
    )
    latitud: models.FloatField[float | None, float | None] = models.FloatField(
        null=True, blank=True
    )
    longitud: models.FloatField[float | None, float | None] = models.FloatField(
        null=True, blank=True
    )
    direccion: models.CharField[str, str] = models.CharField(
        max_length=300, blank=True, default=""
    )
    horario_declarado: models.CharField[str, str] = models.CharField(
        max_length=200, blank=True, default=""
    )
    sitio_web: models.CharField[str, str] = models.CharField(
        max_length=500, blank=True, default=""
    )
    url_fuente: models.TextField[str, str] = models.TextField(blank=True, default="")
    licencia: models.CharField[str, str] = models.CharField(
        max_length=200, blank=True, default=""
    )
    duracion_minutos: models.PositiveIntegerField[int | None, int | None] = (
        models.PositiveIntegerField(null=True, blank=True)
    )
    estado: models.CharField[str, str] = models.CharField(
        max_length=20, choices=ESTADOS, default=ESTADO_PENDIENTE
    )
    atractivo: models.ForeignKey[Atractivo | None, Atractivo | None] = (
        models.ForeignKey(
            Atractivo,
            db_column="id_atractivo",
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            related_name="lugares_candidatos",
            db_index=False,
        )
    )
    notas_revision: models.TextField[str, str] = models.TextField(
        blank=True, default=""
    )
    fecha_creacion: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        auto_now_add=True
    )
    fecha_actualizacion: models.DateTimeField[datetime, datetime] = (
        models.DateTimeField(auto_now=True)
    )

    class Meta:
        db_table = "lugar_candidato"
        ordering = ["fecha_creacion"]
        constraints = [
            models.UniqueConstraint(
                fields=["fuente", "id_externo"],
                name="uq_lugar_candidato_fuente_externo",
            ),
        ]
        indexes = [
            models.Index(
                fields=["importacion", "estado"], name="idx_candidato_import_estado"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.nombre} · {self.fuente}"
