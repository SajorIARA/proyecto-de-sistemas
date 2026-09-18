from django.test import TestCase

from conocimiento.models import FragmentoDocumental, FuenteDocumental


class ModeloSchemaConocimientoTests(TestCase):
    def test_nombres_de_tabla_coinciden_con_el_esquema(self):
        nombres = {
            "fuente_documental": FuenteDocumental,
            "fragmento_documental": FragmentoDocumental,
        }
        for nombre_tabla, modelo in nombres.items():
            with self.subTest(modelo=modelo.__name__):
                self.assertEqual(
                    modelo._meta.db_table,
                    nombre_tabla,
                )

    def test_fragmento_documental_embebbe_embedding_vector(self):
        fuente = FuenteDocumental.objects.create(
            titulo="Guía del Valle de la Luna",
            tipo="guia",
        )
        fragmento = FragmentoDocumental.objects.create(
            fuente=fuente,
            numero_fragmento=0,
            contenido="Atractivo natural al sur de La Paz.",
            embedding=[0.0] * 1536,
        )
        self.assertEqual(fragmento.embedding, [0.0] * 1536)
