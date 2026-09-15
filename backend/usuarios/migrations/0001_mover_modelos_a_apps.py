# Mover modelo al dominio "usuarios". La tabla (db_table) ya existe en la
# BD creada por turismo/0001; aquí solo se declara su estado Django sin
# operaciones de base de datos (no destructivo, conserva datos y columnas).
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name="Rol",
                    fields=[
                        (
                            "id_rol",
                            models.SmallAutoField(primary_key=True, serialize=False),
                        ),
                        ("codigo", models.CharField(max_length=30, unique=True)),
                        ("nombre", models.CharField(max_length=80)),
                        (
                            "descripcion",
                            models.CharField(blank=True, max_length=255, null=True),
                        ),
                    ],
                    options={
                        "db_table": "rol",
                    },
                ),
                migrations.CreateModel(
                    name="Usuario",
                    fields=[
                        (
                            "id_usuario",
                            models.UUIDField(
                                default=uuid.uuid4,
                                editable=False,
                                primary_key=True,
                                serialize=False,
                            ),
                        ),
                        ("email", models.EmailField(max_length=254, unique=True)),
                        ("password_hash", models.CharField(max_length=255)),
                        ("nombre", models.CharField(max_length=150)),
                        ("activo", models.BooleanField(default=True)),
                        ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                        ("fecha_actualizacion", models.DateTimeField(auto_now=True)),
                    ],
                    options={
                        "db_table": "usuario",
                    },
                ),
                migrations.CreateModel(
                    name="UsuarioRol",
                    fields=[
                        ("id", models.BigAutoField(primary_key=True, serialize=False)),
                        (
                            "fecha_asignacion",
                            models.DateTimeField(default=django.utils.timezone.now),
                        ),
                        (
                            "rol",
                            models.ForeignKey(
                                db_column="id_rol",
                                db_index=False,
                                on_delete=django.db.models.deletion.RESTRICT,
                                related_name="usuario_roles",
                                to="usuarios.rol",
                            ),
                        ),
                        (
                            "usuario",
                            models.ForeignKey(
                                db_column="id_usuario",
                                db_index=False,
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="usuario_roles",
                                to="usuarios.usuario",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "usuario_rol",
                    },
                ),
                migrations.AddField(
                    model_name="usuario",
                    name="roles",
                    field=models.ManyToManyField(
                        related_name="usuarios",
                        through="usuarios.UsuarioRol",
                        to="usuarios.rol",
                    ),
                ),
                migrations.AddIndex(
                    model_name="usuariorol",
                    index=models.Index(fields=["rol"], name="idx_usuario_rol_rol"),
                ),
                migrations.AddConstraint(
                    model_name="usuariorol",
                    constraint=models.UniqueConstraint(
                        fields=("usuario", "rol"), name="pk_usuario_rol"
                    ),
                ),
            ],
        ),
    ]