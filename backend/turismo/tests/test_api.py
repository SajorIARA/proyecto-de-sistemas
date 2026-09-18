from django.contrib.gis.geos import Point
from django.test import TestCase

from turismo.models import Atractivo, Categoria


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
        response = self.client.get("/api/turismo/atractivos/")
        self.assertEqual(response.status_code, 200)
        resultado = response.json()["results"][0]
        self.assertEqual(resultado["nombre"], "Valle de la Luna")
        self.assertEqual(resultado["categorias"], ["Naturaleza"])
        self.assertAlmostEqual(resultado["ubicacion"]["longitud"], -68.0673, places=4)
        self.assertAlmostEqual(resultado["ubicacion"]["latitud"], -16.5685, places=4)

    def test_busqueda_por_nombre(self):
        response = self.client.get("/api/turismo/atractivos/?q=luna")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)

    def test_atractivo_inactivo_no_aparece(self):
        self.atractivo.activo = False
        self.atractivo.save(update_fields=["activo"])
        response = self.client.get("/api/turismo/atractivos/")
        self.assertEqual(response.json()["count"], 0)
