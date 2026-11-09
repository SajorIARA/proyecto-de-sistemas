from django.db import migrations, models
import django.db.models
import pgvector.django.vector


class Migration(migrations.Migration):
    dependencies = [("conocimiento", "0001_mover_modelos_a_apps")]

    operations = [
        migrations.AddField(
            model_name="fuentedocumental",
            name="hash_contenido",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="fuentedocumental",
            name="estado_scraping",
            field=models.CharField(
                choices=[
                    ("pendiente", "Pendiente"),
                    ("completado", "Completado"),
                    ("error", "Error"),
                ],
                default="pendiente",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="fuentedocumental",
            name="error_scraping",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="fragmentodocumental",
            name="embedding",
            field=pgvector.django.vector.VectorField(
                blank=True, dimensions=1536, null=True
            ),
        ),
        migrations.AddConstraint(
            model_name="fuentedocumental",
            constraint=models.UniqueConstraint(
                condition=django.db.models.Q(("url__isnull", False)),
                fields=("url",),
                name="uq_fuente_documental_url",
            ),
        ),
    ]
