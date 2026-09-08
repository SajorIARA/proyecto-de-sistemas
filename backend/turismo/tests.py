from django.contrib.gis.geos import Point
from django.core.management import call_command
from django.test import TestCase

from .models import (
    Atractivo,
    AtractivoCategoria,
    Categoria,
    FragmentoDocumental,
    FuenteDocumental,
    Horario,
    Rol,
    Tarifa,
    TipoTarifa,
    Usuario,
    UsuarioRol,
)


class ModeloSchemaTests(TestCase):
    def test_nombres_de_tabla_coinciden_con_el_esquema(self):
        nombres = {
            "usuario": Usuario,
            "rol": Rol,
            "usuario_rol": UsuarioRol,
            "categoria": Categoria,
            "atractivo": Atractivo,
            "atractivo_categoria": AtractivoCategoria,
            "horario": Horario,
            "tipo_tarifa": TipoTarifa,
            "tarifa": Tarifa,
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


class ApiAtractivosTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nombre="Naturaleza")
        self.atractivo = Atractivo.objects.create(
            nombre="Valle de la Luna",
            descripcion="Formaciones rocosas al sur de La Paz.",
            direccion="Av. Valle de la Luna, Mallasa",
            duracion_minutos=120,
            ubicacion=Point(-68.0673, -16.5685, srid=4326),
        )
        self.atractivo.categorias.add(self.categoria)

    def test_listado_es_publico_y_devuelve_geometria(self):
        response = self.client.get("/api/atractivos/")
        self.assertEqual(response.status_code, 200)
        resultado = response.json()["results"][0]
        self.assertEqual(resultado["nombre"], "Valle de la Luna")
        self.assertEqual(resultado["categorias"], ["Naturaleza"])
        self.assertAlmostEqual(resultado["ubicacion"]["longitud"], -68.0673, places=4)
        self.assertAlmostEqual(resultado["ubicacion"]["latitud"], -16.5685, places=4)

    def test_busqueda_por_nombre(self):
        response = self.client.get("/api/atractivos/?q=luna")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)

    def test_atractivo_inactivo_no_aparece(self):
        self.atractivo.activo = False
        self.atractivo.save(update_fields=["activo"])
        response = self.client.get("/api/atractivos/")
        self.assertEqual(response.json()["count"], 0)


class SeedTests(TestCase):
    def test_seed_es_idempotente(self):
        call_command("seed")
        call_command("seed")
        self.assertGreaterEqual(Rol.objects.count(), 2)
        self.assertGreaterEqual(TipoTarifa.objects.count(), 4)
        self.assertGreaterEqual(Categoria.objects.count(), 6)
        self.assertGreaterEqual(Atractivo.objects.count(), 5)
        self.assertGreaterEqual(Horario.objects.count(), 5)
        self.assertGreaterEqual(Tarifa.objects.count(), 4)
