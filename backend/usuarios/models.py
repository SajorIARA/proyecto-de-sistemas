from __future__ import annotations

import uuid
from datetime import datetime

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.contrib.gis.db import models
from django.utils import timezone


class UsuarioManager(BaseUserManager["Usuario"]):
    """Manager del modelo de autenticación (usa los hashers por defecto de
    Django, PBKDF2-SHA256, para encriptar la contraseña en la BD)."""

    use_in_migrations = True

    def _create_user(
        self, email: str, password: str | None, *, activo: bool = True, **extra
    ) -> "Usuario":
        if not email:
            raise ValueError("Debe proveer un email")
        usuario = self.model(email=self.normalize_email(email), activo=activo, **extra)
        if password:
            usuario.set_password(password)
        else:
            usuario.set_unusable_password()
        usuario.save(using=self._db)
        return usuario

    def create_user(
        self, email: str, password: str | None = None, **extra
    ) -> "Usuario":
        return self._create_user(email, password, **extra)

    def create_superuser(
        self, email: str, password: str | None = None, **extra
    ) -> "Usuario":
        extra.setdefault("activo", True)
        return self._create_user(email, password, **extra)

    def get_by_natural_key(self, email: str) -> "Usuario":
        return self.get(email__iexact=email)


class Usuario(AbstractBaseUser):
    USERNAME_FIELD: str = "email"
    EMAIL_FIELD: str = "email"
    REQUIRED_FIELDS: list[str] = []
    last_login = None

    @property
    def is_active(self) -> bool:
        return self.activo

    @is_active.setter
    def is_active(self, value: bool) -> None:
        self.activo = value

    @property
    def is_anonymous(self) -> bool:
        return False

    @property
    def is_authenticated(self) -> bool:
        return True

    def get_username(self) -> str:
        return self.email

    # Permisos delegados al RBAC por roles (issue #12): solo el rol ADMIN
    # concentra todos los permisos Django; el resto de roles no hereda nada
    # por defecto. Los permisos de API se evalúan con las clases de
    # usuarios.permissions (HasRole/IsAdmin/IsTurista/IsAdminOrReadOnly).
    def has_perm(self, perm: str, obj: object | None = None) -> bool:
        if not self.activo:
            return False
        return self.roles.filter(codigo="ADMIN").exists()

    def has_module_perms(self, app_label: str) -> bool:
        if not self.activo:
            return False
        return self.roles.filter(codigo="ADMIN").exists()

    @property
    def is_staff(self) -> bool:
        return self.activo and self.roles.filter(codigo="ADMIN").exists()

    @property
    def is_superuser(self) -> bool:
        return self.activo and self.roles.filter(codigo="ADMIN").exists()

    id_usuario: models.UUIDField[uuid.UUID, uuid.UUID] = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    email: models.EmailField[str, str] = models.EmailField(max_length=254, unique=True)
    password: models.CharField[str, str] = models.CharField(
        max_length=255, db_column="password_hash"
    )
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

    objects = UsuarioManager()

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
