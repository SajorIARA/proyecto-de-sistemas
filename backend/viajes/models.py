"""Persistencia de viajes y de sus paradas ordenadas.

Antes la selección de destinos vivía solo en el estado del frontend; estos
modelos permiten recuperar el plan, avanzar su estado y registrar visitas.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from django.db import models


class Viaje(models.Model):
    """Plan de viaje perteneciente a un usuario autenticado."""

    class Estado(models.TextChoices):
        PLANIFICADO = "planificado", "Planificado"
        EN_CURSO = "en_curso", "En curso"
        FINALIZADO = "finalizado", "Finalizado"

    id_viaje = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        "usuarios.Usuario",
        db_column="id_usuario",
        on_delete=models.CASCADE,
        related_name="viajes",
    )
    nombre = models.CharField(max_length=150)
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.PLANIFICADO,
    )
    creado_en: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        auto_now_add=True
    )
    actualizado_en: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        auto_now=True
    )
    iniciado_en: models.DateTimeField[datetime | None, datetime | None] = (
        models.DateTimeField(null=True, blank=True)
    )
    finalizado_en: models.DateTimeField[datetime | None, datetime | None] = (
        models.DateTimeField(null=True, blank=True)
    )

    class Meta:
        db_table = "viaje"
        ordering = ["-actualizado_en"]

    def __str__(self) -> str:
        return f"{self.nombre} · {self.usuario}"


class ParadaViaje(models.Model):
    """Destino incluido en un viaje, con orden y seguimiento de visita."""

    id_parada = models.BigAutoField(primary_key=True)
    viaje = models.ForeignKey(
        Viaje,
        db_column="id_viaje",
        on_delete=models.CASCADE,
        related_name="paradas",
    )
    atractivo = models.ForeignKey(
        "turismo.Atractivo",
        db_column="id_atractivo",
        on_delete=models.PROTECT,
        related_name="paradas_viaje",
    )
    orden = models.PositiveSmallIntegerField(default=0)
    visitada: models.BooleanField[bool, bool] = models.BooleanField(default=False)
    visitada_en: models.DateTimeField[datetime | None, datetime | None] = (
        models.DateTimeField(null=True, blank=True)
    )

    class Meta:
        db_table = "parada_viaje"
        ordering = ["orden", "id_parada"]
        constraints = [
            models.UniqueConstraint(
                fields=["viaje", "atractivo"],
                name="uq_viaje_atractivo",
            )
        ]

    def __str__(self) -> str:
        return f"{self.orden}: {self.atractivo}"
