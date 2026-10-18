from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        (
            "usuarios",
            "0002_alter_usuario_managers_alter_usuario_password_hash_and_more",
        ),
    ]

    operations = [
        migrations.AlterField(
            model_name="rol",
            name="codigo",
            field=models.CharField(
                choices=[("ADMIN", "Administrador"), ("TOURIST", "Turista")],
                max_length=30,
                unique=True,
            ),
        ),
    ]
