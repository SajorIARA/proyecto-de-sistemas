from __future__ import annotations

import uuid
from datetime import date, datetime, time
from decimal import Decimal

from django.contrib.gis.db import models
from django.contrib.postgres.indexes import GistIndex


class Categoria(models.Model):
    id_categoria: models.BigAutoField[int, int] = models.BigAutoField(primary_key=True)
    nombre: models.CharField[str, str] = models.CharField(max_length=100, unique=True)
    descripcion: models.TextField[str | None, str | None] = models.TextField(
        null=True, blank=True
    )
    activo: models.BooleanField[bool, bool] = models.BooleanField(default=True)

    class Meta:
        db_table = "categoria"

    def __str__(self) -> str:
        return self.nombre


class Atractivo(models.Model):
    id_atractivo: models.UUIDField[uuid.UUID, uuid.UUID] = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    nombre: models.CharField[str, str] = models.CharField(max_length=200)
    descripcion: models.TextField[str, str] = models.TextField()
    direccion: models.CharField[str | None, str | None] = models.CharField(
        max_length=300, null=True, blank=True
    )
    duracion_minutos: models.IntegerField[int | None, int | None] = models.IntegerField(
        null=True, blank=True
    )
    ubicacion: models.PointField = models.PointField(srid=4326, spatial_index=False)
    area: models.PolygonField = models.PolygonField(
        srid=4326, null=True, blank=True, spatial_index=False
    )
    fuente_origen: models.CharField[str, str] = models.CharField(
        max_length=100, default="INSTITUCIONAL", db_default="INSTITUCIONAL"
    )
    activo: models.BooleanField[bool, bool] = models.BooleanField(default=True)
    fecha_creacion: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        auto_now_add=True
    )
    fecha_actualizacion: models.DateTimeField[datetime, datetime] = (
        models.DateTimeField(auto_now=True)
    )

    categorias: models.ManyToManyField[Categoria, AtractivoCategoria] = (
        models.ManyToManyField(
            "Categoria",
            through="AtractivoCategoria",
            related_name="atractivos",
        )
    )

    class Meta:
        db_table = "atractivo"
        constraints = [
            models.CheckConstraint(
                check=models.Q(duracion_minutos__isnull=True)
                | models.Q(duracion_minutos__gt=0),
                name="ck_atractivo_duracion",
            )
        ]
        indexes = [
            GistIndex(fields=["ubicacion"], name="idx_atractivo_ubicacion_gist"),
            GistIndex(fields=["area"], name="idx_atractivo_area_gist"),
        ]

    def __str__(self) -> str:
        return self.nombre


class AtractivoCategoria(models.Model):
    # Misma representación de PK compuesta que UsuarioRol (ver models).
    id: models.BigAutoField[int, int] = models.BigAutoField(primary_key=True)
    atractivo: models.ForeignKey[Atractivo, Atractivo] = models.ForeignKey(
        Atractivo,
        db_column="id_atractivo",
        on_delete=models.CASCADE,
        related_name="atractivo_categorias",
        db_index=False,
    )
    categoria: models.ForeignKey[Categoria, Categoria] = models.ForeignKey(
        Categoria,
        db_column="id_categoria",
        on_delete=models.RESTRICT,
        related_name="atractivo_categorias",
        db_index=False,
    )

    class Meta:
        db_table = "atractivo_categoria"
        constraints = [
            models.UniqueConstraint(
                fields=["atractivo", "categoria"],
                name="pk_atractivo_categoria",
            )
        ]
        indexes = [
            models.Index(
                fields=["categoria"],
                # SQL V2: idx_atractivo_categoria_categoria (>30 → trunca)
                name="idx_atractivo_cat_cat",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.atractivo} · {self.categoria}"


class Horario(models.Model):
    id_horario: models.BigAutoField[int, int] = models.BigAutoField(primary_key=True)
    atractivo: models.ForeignKey[Atractivo, Atractivo] = models.ForeignKey(
        Atractivo,
        db_column="id_atractivo",
        on_delete=models.CASCADE,
        related_name="horarios",
        db_index=False,
    )
    dia_semana: models.SmallIntegerField[int, int] = models.SmallIntegerField()
    hora_apertura: models.TimeField[time | None, time | None] = models.TimeField(
        null=True, blank=True
    )
    hora_cierre: models.TimeField[time | None, time | None] = models.TimeField(
        null=True, blank=True
    )
    cerrado: models.BooleanField[bool, bool] = models.BooleanField(default=False)
    vigente_desde: models.DateField[date | None, date | None] = models.DateField(
        null=True, blank=True
    )
    vigente_hasta: models.DateField[date | None, date | None] = models.DateField(
        null=True, blank=True
    )

    class Meta:
        db_table = "horario"
        constraints = [
            models.CheckConstraint(
                check=models.Q(dia_semana__gte=1) & models.Q(dia_semana__lte=7),
                name="ck_horario_dia",
            ),
            models.CheckConstraint(
                check=models.Q(cerrado=True)
                | (
                    models.Q(hora_apertura__isnull=False)
                    & models.Q(hora_cierre__isnull=False)
                    & models.Q(hora_apertura__lt=models.F("hora_cierre"))
                ),
                name="ck_horario_horas",
            ),
            models.CheckConstraint(
                check=models.Q(vigente_hasta__isnull=True)
                | models.Q(vigente_desde__isnull=True)
                | models.Q(vigente_hasta__gte=models.F("vigente_desde")),
                name="ck_horario_vigencia",
            ),
        ]
        indexes = [
            models.Index(
                fields=["atractivo", "dia_semana"],
                name="idx_horario_atractivo_dia",
            )
        ]

    def __str__(self) -> str:
        return f"{self.atractivo} · día {self.dia_semana}"


class TipoTarifa(models.Model):
    id_tipo_tarifa: models.SmallAutoField[int, int] = models.SmallAutoField(
        primary_key=True
    )
    codigo: models.CharField[str, str] = models.CharField(max_length=30, unique=True)
    nombre: models.CharField[str, str] = models.CharField(max_length=100)
    descripcion: models.CharField[str | None, str | None] = models.CharField(
        max_length=255, null=True, blank=True
    )

    class Meta:
        db_table = "tipo_tarifa"

    def __str__(self) -> str:
        return self.nombre


class Tarifa(models.Model):
    id_tarifa: models.BigAutoField[int, int] = models.BigAutoField(primary_key=True)
    atractivo: models.ForeignKey[Atractivo, Atractivo] = models.ForeignKey(
        Atractivo,
        db_column="id_atractivo",
        on_delete=models.CASCADE,
        related_name="tarifas",
        db_index=False,
    )
    tipo_tarifa: models.ForeignKey[TipoTarifa, TipoTarifa] = models.ForeignKey(
        TipoTarifa,
        db_column="id_tipo_tarifa",
        on_delete=models.RESTRICT,
        related_name="tarifas",
        db_index=False,
    )
    monto: models.DecimalField[Decimal, Decimal] = models.DecimalField(
        max_digits=10, decimal_places=2
    )
    moneda: models.CharField[str, str] = models.CharField(max_length=3, default="BOB")
    vigente_desde: models.DateField[date | None, date | None] = models.DateField(
        null=True, blank=True
    )
    vigente_hasta: models.DateField[date | None, date | None] = models.DateField(
        null=True, blank=True
    )
    observacion: models.CharField[str | None, str | None] = models.CharField(
        max_length=300, null=True, blank=True
    )

    class Meta:
        db_table = "tarifa"
        constraints = [
            models.CheckConstraint(
                check=models.Q(monto__gte=0), name="ck_tarifa_monto"
            ),
            models.CheckConstraint(
                check=models.Q(vigente_hasta__isnull=True)
                | models.Q(vigente_desde__isnull=True)
                | models.Q(vigente_hasta__gte=models.F("vigente_desde")),
                name="ck_tarifa_vigencia",
            ),
        ]
        indexes = [
            models.Index(fields=["atractivo"], name="idx_tarifa_atractivo"),
            models.Index(
                fields=["atractivo", "monto"],
                name="idx_tarifa_atractivo_monto",
            ),
            models.Index(fields=["tipo_tarifa"], name="idx_tarifa_tipo"),
        ]

    def __str__(self) -> str:
        return f"{self.atractivo} · {self.tipo_tarifa} · {self.monto} {self.moneda}"
