import pgvector.django.indexes
import pgvector.django.vector
from django.db import migrations, models


def limpiar_embeddings_anteriores(apps, schema_editor):
    # Un vector de 1536 no se puede convertir correctamente a 768. Se conserva
    # el texto y se marca para revectorización con el modelo nuevo.
    schema_editor.execute(
        "UPDATE fragmento_documental SET embedding = NULL WHERE embedding IS NOT NULL"
    )


class Migration(migrations.Migration):
    dependencies = [("conocimiento", "0002_scraping_fuentes")]

    operations = [
        migrations.AddField(
            model_name="fragmentodocumental",
            name="embedding_actualizado",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="fragmentodocumental",
            name="embedding_dimension",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="fragmentodocumental",
            name="embedding_modelo",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.RunPython(limpiar_embeddings_anteriores, migrations.RunPython.noop),
        migrations.RemoveIndex(
            model_name="fragmentodocumental",
            name="idx_fragmento_embedding_hnsw",
        ),
        migrations.AlterField(
            model_name="fragmentodocumental",
            name="embedding",
            field=pgvector.django.vector.VectorField(
                blank=True, dimensions=768, null=True
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
    ]
