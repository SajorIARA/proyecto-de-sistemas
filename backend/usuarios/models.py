from __future__ import annotations

import uuid
from datetime import datetime

from django.contrib.gis.db import models
from django.utils import timezone


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

    roles: models.ManyToManyField[Rol, UsuarioRol] = models.ManyToManyField(
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