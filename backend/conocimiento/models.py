from __future__ import annotations

import uuid
from datetime import datetime

from django.contrib.gis.db import models
from pgvector.django import HnswIndex, VectorField

from turismo.models import Atractivo


class FuenteDocumental(models.Model):
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
    embedding: VectorField = VectorField(dimensions=1536)
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