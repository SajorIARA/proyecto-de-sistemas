from django.contrib.gis.geos import Point
from django.test import TestCase

from turismo.models import (
    Atractivo,
    AtractivoCategoria,
    Categoria,
    Horario,
    Tarifa,
    TipoTarifa,
)


class ModeloSchemaTurismoTests(TestCase):
    def test_nombres_de_tabla_coinciden_con_el_esquema(self):
        nombres = {
            "categoria": Categoria,
            "atractivo": Atractivo,
            "atractivo_categoria": AtractivoCategoria,
            "horario": Horario,
            "tipo_tarifa": TipoTarifa,
            "tarifa": Tarifa,
        }
        for nombre_tabla, modelo in nombres.items():
            with self.subTest(modelo=modelo.__name__):
                self.assertEqual(
                    modelo._meta.db_table,
                    nombre_tabla,
                )

    def test_atractivo_por_defecto_tiene_fuente_institucional(self):
        atractivo = Atractivo.objects.create(
            nombre="Plaza Test",
            descripcion="Descripción",
            ubicacion=Point(-68.1, -16.5, srid=4326),
        )
        self.assertEqual(atractivo.fuente_origen, "INSTITUCIONAL")
        self.assertEqual(
            Atractivo._meta.get_field("fuente_origen").db_default,
            "INSTITUCIONAL",
        )
