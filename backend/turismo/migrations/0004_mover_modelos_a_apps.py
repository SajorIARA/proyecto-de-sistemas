# Split de modelos hacia las apps de dominio (usuarios, recomendaciones,
# conocimiento). La BD física no cambia: las tablas (db_table) ya existen
# y conservan datos/columnas; aquí solo se quitan los modelos del estado
# de la app "turismo" (state_operations), sin operaciones destructivas.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("turismo", "0003_alter_atractivo_fuente_origen"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(
                    model_name="fragmentodocumental",
                    name="fuente",
                ),
                migrations.RemoveField(
                    model_name="fuentedocumental",
                    name="atractivo",
                ),
                migrations.RemoveField(
                    model_name="usuariorol",
                    name="rol",
                ),
                migrations.RemoveField(
                    model_name="usuario",
                    name="roles",
                ),
                migrations.RemoveField(
                    model_name="usuariopreferencia",
                    name="usuario",
                ),
                migrations.RemoveField(
                    model_name="usuariorol",
                    name="usuario",
                ),
                migrations.RemoveField(
                    model_name="usuariopreferencia",
                    name="categoria",
                ),
                migrations.DeleteModel(
                    name="ConsultaRecomendacion",
                ),
                migrations.DeleteModel(
                    name="FragmentoDocumental",
                ),
                migrations.DeleteModel(
                    name="FuenteDocumental",
                ),
                migrations.DeleteModel(
                    name="Rol",
                ),
                migrations.DeleteModel(
                    name="Usuario",
                ),
                migrations.DeleteModel(
                    name="UsuarioRol",
                ),
                migrations.DeleteModel(
                    name="UsuarioPreferencia",
                ),
            ],
        ),
    ]