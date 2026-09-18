from decimal import Decimal

from django.contrib.gis.geos import Point
from django.test import TestCase

from recomendaciones.models import ConsultaRecomendacion, UsuarioPreferencia
from turismo.models import Categoria
from usuarios.models import Usuario


class ModeloSchemaRecomendacionesTests(TestCase):
    def test_nombres_de_tabla_coinciden_con_el_esquema(self):
        nombres = {
            "usuario_preferencia": UsuarioPreferencia,
            "consulta_recomendacion": ConsultaRecomendacion,
        }
        for nombre_tabla, modelo in nombres.items():
            with self.subTest(modelo=modelo.__name__):
                self.assertEqual(
                    modelo._meta.db_table,
                    nombre_tabla,
                )

    def test_preferencia_valida_el_nivel_de_interes(self):
        usuario = Usuario.objects.create(
            email="turista@example.com",
            password="hash",
            nombre="Turista",
        )
        categoria = Categoria.objects.create(nombre="Naturaleza")
        preferencia = UsuarioPreferencia.objects.create(
            usuario=usuario,
            categoria=categoria,
            nivel_interes=Decimal("0.80"),
        )
        self.assertEqual(preferencia.nivel_interes, Decimal("0.80"))

        con_nivel_invalido = UsuarioPreferencia(
            usuario=usuario,
            categoria=categoria,
            nivel_interes=Decimal("1.50"),
        )
        with self.assertRaises(Exception):
            con_nivel_invalido.save()

    def test_consulta_requiere_presupuesto_no_negativo_y_tiempo_positivo(self):
        usuario = Usuario.objects.create(
            email="turista2@example.com",
            password="hash",
            nombre="Turista 2",
        )
        consulta = ConsultaRecomendacion.objects.create(
            usuario=usuario,
            presupuesto_bob=Decimal("120.00"),
            tiempo_horas=Decimal("6.00"),
            punto_partida=Point(-68.1, -16.5, srid=4326),
        )
        self.assertEqual(consulta.presupuesto_bob, Decimal("120.00"))

        con_tiempo_invalido = ConsultaRecomendacion(
            usuario=usuario,
            presupuesto_bob=Decimal("50.00"),
            tiempo_horas=Decimal("0.00"),
            punto_partida=Point(-68.1, -16.5, srid=4326),
        )
        with self.assertRaises(Exception):
            con_tiempo_invalido.save()
