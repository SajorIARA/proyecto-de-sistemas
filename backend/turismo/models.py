from __future__ import annotations

import uuid
from datetime import date, datetime, time
from decimal import Decimal

from django.contrib.gis.db import models
from django.contrib.postgres.indexes import GistIndex
from django.utils import timezone
from pgvector.django import HnswIndex, VectorField


class Usuario(models.Model):
    id_usuario: models.UUIDField[uuid.UUID, uuid.UUID] = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    email: models.EmailField[str, str] = models.EmailField(max_length=254, unique=True)
    password_hash: models.CharField[str, str] = models.CharField(max_length=255)
    nombre: models.CharField[str, str] = models.CharField(max_length=150)
    activo: models.BooleanField[bool, bool] = models.BooleanField(default=True)
    fecha_creacion: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        auto_now_add=True
    )
    fecha_actualizacion: models.DateTimeField[datetime, datetime] = (
        models.DateTimeField(auto_now=True)
    )

    roles: models.ManyToManyField["Rol", "UsuarioRol"] = models.ManyToManyField(
        "Rol",
        through="UsuarioRol",
        related_name="usuarios",
    )

    class Meta:
        db_table = "usuario"

    def __str__(self) -> str:
        return self.nombre


class Rol(models.Model):
    id_rol: models.SmallAutoField[int, int] = models.SmallAutoField(primary_key=True)
    codigo: models.CharField[str, str] = models.CharField(max_length=30, unique=True)
    nombre: models.CharField[str, str] = models.CharField(max_length=80)
    descripcion: models.CharField[str | None, str | None] = models.CharField(
        max_length=255, null=True, blank=True
    )

    class Meta:
        db_table = "rol"

    def __str__(self) -> str:
        return self.nombre


class UsuarioRol(models.Model):
    # Django no soporta claves primarias compuestas: la PK compuesta
    # (id_usuario, id_rol) del esquema se representa con un id sintético
    # y una restricción de unicidad equivalente.
    id: models.BigAutoField[int, int] = models.BigAutoField(primary_key=True)
    usuario: models.ForeignKey[Usuario, Usuario] = models.ForeignKey(
        Usuario,
        db_column="id_usuario",
        on_delete=models.CASCADE,
        related_name="usuario_roles",
        db_index=False,
    )
    rol: models.ForeignKey[Rol, Rol] = models.ForeignKey(
        Rol,
        db_column="id_rol",
        on_delete=models.RESTRICT,
        related_name="usuario_roles",
        db_index=False,
    )
    fecha_asignacion: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        default=timezone.now
    )

    class Meta:
        db_table = "usuario_rol"
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "rol"],
                name="pk_usuario_rol",
            )
        ]
        indexes = [
            models.Index(fields=["rol"], name="idx_usuario_rol_rol"),
        ]

    def __str__(self) -> str:
        return f"{self.usuario} · {self.rol}"


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
    activo: models.BooleanField[bool, bool] = models.BooleanField(default=True)
    fecha_creacion: models.DateTimeField[datetime, datetime] = models.DateTimeField(
        auto_now_add=True
    )
    fecha_actualizacion: models.DateTimeField[datetime, datetime] = (
        models.DateTimeField(auto_now=True)
    )

    categorias: models.ManyToManyField["Categoria", "AtractivoCategoria"] = (
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
    # Misma representación de PK compuesta que UsuarioRol (ver modelos).
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
            models.Index(fields=["categoria"], name="idx_atractivo_categoria"),
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
            models.Index(fields=["atractivo"], name="idx_fuente_atractivo"),
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
