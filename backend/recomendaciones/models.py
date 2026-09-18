from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from django.contrib.gis.db import models
from django.contrib.postgres.indexes import GistIndex
from django.utils import timezone

from turismo.models import Categoria
from usuarios.models import Usuario


class UsuarioPreferencia(models.Model):
    # Resuelve RF-08, PB-16 y HU-07 (persistencia de gustos del turista).
    # PK compuesta (id_usuario, id_categoria) con id sintético + unicidad
    # equivalente (mismo patrón que UsuarioRol).
    id: models.BigAutoField[int, int] = models.BigAutoField(primary_key=True)
    usuario: models.ForeignKey[Usuario, Usuario] = models.ForeignKey(
        Usuario,
        db_column="id_usuario",
        on_delete=models.CASCADE,
        related_name="preferencias",
        db_index=False,
    )
    categoria: models.ForeignKey[Categoria, Categoria] = models.ForeignKey(
        Categoria,
        db_column="id_categoria",
        on_delete=models.CASCADE,
        related_name="preferencias",
        db_index=False,
    )
    nivel_interes: models.DecimalField[Decimal, Decimal] = models.DecimalField(
        max_digits=3, decimal_places=2, default=Decimal("1.00")
    )
    fecha_registro: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        default=timezone.now
    )

    class Meta:
        db_table = "usuario_preferencia"
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "categoria"],
                name="pk_usuario_preferencia",
            ),
            models.CheckConstraint(
                check=models.Q(nivel_interes__gte=Decimal("0.00"))
                & models.Q(nivel_interes__lte=Decimal("1.00")),
                name="ck_usuario_preferencia_nivel",
            ),
        ]
        indexes = [
            models.Index(
                fields=["categoria"],
                # SQL V2: idx_usuario_preferencia_categoria (>30 → trunca)
                name="idx_upref_categoria",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.usuario} · {self.categoria} · {self.nivel_interes:.2f}"


class ConsultaRecomendacion(models.Model):
    id_consulta: models.UUIDField[uuid.UUID, uuid.UUID] = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    usuario: models.ForeignKey[Usuario | None, Usuario | None] = models.ForeignKey(
        Usuario,
        db_column="id_usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultas_recomendacion",
        db_index=False,
    )
    presupuesto_bob: models.DecimalField[Decimal, Decimal] = models.DecimalField(
        max_digits=10, decimal_places=2
    )
    tiempo_horas: models.DecimalField[Decimal, Decimal] = models.DecimalField(
        max_digits=4, decimal_places=2
    )
    punto_partida: models.PointField = models.PointField(srid=4326, spatial_index=False)
    macrodistrito: models.CharField[str | None, str | None] = models.CharField(
        max_length=80, null=True, blank=True
    )
    fecha_consulta: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        default=timezone.now
    )

    class Meta:
        db_table = "consulta_recomendacion"
        constraints = [
            models.CheckConstraint(
                check=models.Q(presupuesto_bob__gte=Decimal("0.00")),
                name="ck_consulta_presupuesto",
            ),
            models.CheckConstraint(
                check=models.Q(tiempo_horas__gt=Decimal("0.00")),
                name="ck_consulta_tiempo",
            ),
        ]
        indexes = [
            models.Index(fields=["usuario"], name="idx_consulta_usuario"),
            GistIndex(
                fields=["punto_partida"],
                name="idx_consulta_punto_partida_gist",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.fecha_consulta:%Y-%m-%d} · {self.presupuesto_bob} BOB · {self.tiempo_horas} h"