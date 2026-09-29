from django.db import migrations, models

import usuarios.models


class Migration(migrations.Migration):

    dependencies = [
        ("usuarios", "0001_mover_modelos_a_apps"),
    ]

    operations = [
        migrations.AlterModelManagers(
            name="usuario",
            managers=[
                ("objects", usuarios.models.UsuarioManager()),
            ],
        ),
        migrations.AlterField(
            model_name="usuario",
            name="password_hash",
            field=models.CharField(db_column="password_hash", max_length=255),
        ),
        migrations.RenameField(
            model_name="usuario",
            old_name="password_hash",
            new_name="password",
        ),
    ]
