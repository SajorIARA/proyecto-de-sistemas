# Mover modelos al dominio "conocimiento" (RAG). Las tablas ya existen
# (creadas por turismo/0001): solo se declara el estado Django, sin
# operaciones de base de datos.
import uuid

import django.db.models.deletion
import pgvector.django.indexes
import pgvector.django.vector
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("turismo", "0004_mover_modelos_a_apps"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name="FuenteDocumental",
                    fields=[
                        (
                            "id_fuente",
                            models.UUIDField(
                                default=uuid.uuid4,
                                editable=False,
                                primary_key=True,
                                serialize=False,
                            ),
                        ),
                        ("titulo", models.CharField(max_length=250)),
                        ("url", models.TextField(blank=True, null=True)),
                        (
                            "tipo",
                            models.CharField(blank=True, max_length=50, null=True),
                        ),
                        (
                            "fecha_actualizacion",
                            models.DateTimeField(blank=True, null=True),
                        ),
                        ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                        (
                            "atractivo",
                            models.ForeignKey(
                                blank=True,
                                db_column="id_atractivo",
                                db_index=False,
                                null=True,
                                on_delete=django.db.models.deletion.SET_NULL,
                                related_name="fuentes",
                                to="turismo.atractivo",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "fuente_documental",
                    },
                ),
                migrations.CreateModel(
                    name="FragmentoDocumental",
                    fields=[
                        (
                            "id_fragmento",
                            models.BigAutoField(primary_key=True, serialize=False),
                        ),
                        ("numero_fragmento", models.IntegerField()),
                        ("contenido", models.TextField()),
                        (
                            "embedding",
                            pgvector.django.vector.VectorField(dimensions=1536),
                        ),
                        ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                        (
                            "fuente",
                            models.ForeignKey(
                                db_column="id_fuente",
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="fragmentos",
                                to="conocimiento.fuentedocumental",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "fragmento_documental",
                    },
                ),
                migrations.AddIndex(
                    model_name="fuentedocumental",
                    index=models.Index(
                        fields=["atractivo"], name="idx_fuente_doc_atractivo"
                    ),
                ),
                migrations.AddIndex(
                    model_name="fragmentodocumental",
                    index=pgvector.django.indexes.HnswIndex(
                        fields=["embedding"],
                        name="idx_fragmento_embedding_hnsw",
                        opclasses=["vector_cosine_ops"],
                    ),
                ),
                migrations.AddConstraint(
                    model_name="fragmentodocumental",
                    constraint=models.CheckConstraint(
                        condition=models.Q(("numero_fragmento__gte", 0)),
                        name="ck_fragmento_numero",
                    ),
                ),
                migrations.AddConstraint(
                    model_name="fragmentodocumental",
                    constraint=models.UniqueConstraint(
                        fields=("fuente", "numero_fragmento"),
                        name="uq_fragmento_fuente_numero",
                    ),
                ),
            ],
        ),
    ]
