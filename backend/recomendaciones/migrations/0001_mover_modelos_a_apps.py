# Mover modelos al dominio "recomendaciones". Las tablas ya existen
# (creadas por turismo/0001 y 0002): solo se declara el estado Django,
# sin operaciones de base de datos.
import uuid
from decimal import Decimal

import django.contrib.gis.db.models.fields
import django.contrib.postgres.indexes
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("usuarios", "0001_mover_modelos_a_apps"),
        ("turismo", "0004_mover_modelos_a_apps"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name="ConsultaRecomendacion",
                    fields=[
                        (
                            "id_consulta",
                            models.UUIDField(
                                default=uuid.uuid4,
                                editable=False,
                                primary_key=True,
                                serialize=False,
                            ),
                        ),
                        (
                            "presupuesto_bob",
                            models.DecimalField(decimal_places=2, max_digits=10),
                        ),
                        (
                            "tiempo_horas",
                            models.DecimalField(decimal_places=2, max_digits=4),
                        ),
                        (
                            "punto_partida",
                            django.contrib.gis.db.models.fields.PointField(
                                spatial_index=False, srid=4326
                            ),
                        ),
                        (
                            "macrodistrito",
                            models.CharField(blank=True, max_length=80, null=True),
                        ),
                        (
                            "fecha_consulta",
                            models.DateTimeField(default=django.utils.timezone.now),
                        ),
                        (
                            "usuario",
                            models.ForeignKey(
                                blank=True,
                                db_column="id_usuario",
                                db_index=False,
                                null=True,
                                on_delete=django.db.models.deletion.SET_NULL,
                                related_name="consultas_recomendacion",
                                to="usuarios.usuario",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "consulta_recomendacion",
                        "indexes": [
                            models.Index(
                                fields=["usuario"], name="idx_consulta_usuario"
                            ),
                            django.contrib.postgres.indexes.GistIndex(
                                fields=["punto_partida"],
                                name="idx_consulta_punto_partida_gist",
                            ),
                        ],
                        "constraints": [
                            models.CheckConstraint(
                                condition=models.Q(
                                    ("presupuesto_bob__gte", Decimal("0.00"))
                                ),
                                name="ck_consulta_presupuesto",
                            ),
                            models.CheckConstraint(
                                condition=models.Q(
                                    ("tiempo_horas__gt", Decimal("0.00"))
                                ),
                                name="ck_consulta_tiempo",
                            ),
                        ],
                    },
                ),
                migrations.CreateModel(
                    name="UsuarioPreferencia",
                    fields=[
                        ("id", models.BigAutoField(primary_key=True, serialize=False)),
                        (
                            "nivel_interes",
                            models.DecimalField(
                                decimal_places=2,
                                default=Decimal("1.00"),
                                max_digits=3,
                            ),
                        ),
                        (
                            "fecha_registro",
                            models.DateTimeField(default=django.utils.timezone.now),
                        ),
                        (
                            "categoria",
                            models.ForeignKey(
                                db_column="id_categoria",
                                db_index=False,
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="preferencias",
                                to="turismo.categoria",
                            ),
                        ),
                        (
                            "usuario",
                            models.ForeignKey(
                                db_column="id_usuario",
                                db_index=False,
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="preferencias",
                                to="usuarios.usuario",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "usuario_preferencia",
                        "indexes": [
                            models.Index(
                                fields=["categoria"], name="idx_upref_categoria"
                            )
                        ],
                        "constraints": [
                            models.UniqueConstraint(
                                fields=("usuario", "categoria"),
                                name="pk_usuario_preferencia",
                            ),
                            models.CheckConstraint(
                                condition=models.Q(
                                    ("nivel_interes__gte", Decimal("0.00")),
                                    ("nivel_interes__lte", Decimal("1.00")),
                                ),
                                name="ck_usuario_preferencia_nivel",
                            ),
                        ],
                    },
                ),
            ],
        ),
    ]
