from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("turismo", "0007_atractivo_url")]

    operations = [
        migrations.AddField(
            model_name="foto",
            name="atribucion",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="foto",
            name="licencia",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="foto",
            name="url_origen",
            field=models.URLField(blank=True, default="", max_length=500),
        ),
    ]
