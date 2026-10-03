from __future__ import annotations

from decimal import Decimal

from django.contrib.gis.geos import Point
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from turismo.models import Atractivo, Categoria, Tarifa, TipoTarifa

URL = "/api/turismo/atractivos/"


def _crear(
    nombre: str,
    *,
    direccion: str = "Centro",
    descripcion: str = "Descripción",
    categorias: list | None = None,
    tarifas: list | None = None,
) -> Atractivo:
    atractivo = Atractivo.objects.create(
        nombre=nombre,
        descripcion=descripcion,
        direccion=direccion,
        ubicacion=Point(-68.14, -16.49, srid=4326),
    )
    if categorias:
        atractivo.categorias.set(categorias)
    tipo, _ = TipoTarifa.objects.get_or_create(
        codigo="GEN", defaults={"nombre": "General"}
    )
    for monto in tarifas or []:
        Tarifa.objects.create(
            atractivo=atractivo,
            tipo_tarifa=tipo,
            monto=Decimal(str(monto)),
            moneda="BOB",
        )
    return atractivo


class FiltrosCombinadosTests(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.cultura = Categoria.objects.create(nombre="Cultura")
        cls.natura = Categoria.objects.create(nombre="Naturaleza")
        _crear(
            "Museo Central",
            direccion="Calle Comercio, Centro",
            descripcion="Museo de historia",
            categorias=[cls.cultura],
            tarifas=[20],
        )
        _crear(
            "Valle Verde",
            direccion="Mallasa",
            descripcion="Senderos naturales",
            categorias=[cls.natura],
            tarifas=[0],
        )
        _crear(
            "Mirador Alto",
            direccion="El Alto",
            descripcion="Vista panorámica",
            categorias=[cls.cultura, cls.natura],
        )

    def setUp(self) -> None:
        self.cliente = APIClient()

    def test_q_busca_en_descripcion_y_direccion(self) -> None:
        resp = self.cliente.get(URL, {"q": "senderos"})
        self.assertEqual([r["nombre"] for r in resp.data["results"]], ["Valle Verde"])
        resp = self.cliente.get(URL, {"q": "comercio"})
        self.assertEqual([r["nombre"] for r in resp.data["results"]], ["Museo Central"])

    def test_filtro_categoria_por_nombre(self) -> None:
        resp = self.cliente.get(URL, {"categoria": "Naturaleza"})
        nombres = sorted(r["nombre"] for r in resp.data["results"])
        self.assertEqual(nombres, ["Mirador Alto", "Valle Verde"])

    def test_filtro_categoria_por_id_y_coma(self) -> None:
        resp = self.cliente.get(URL, {"categoria": str(self.cultura.pk)})
        self.assertEqual(resp.data["count"], 2)
        resp = self.cliente.get(URL, {"categoria": "Cultura,Naturaleza"})
        self.assertEqual(resp.data["count"], 3)

    def test_filtro_categoria_inexistente_vacio(self) -> None:
        resp = self.cliente.get(URL, {"categoria": "NoExiste"})
        self.assertEqual(resp.data["count"], 0)

    def test_filtro_zona(self) -> None:
        resp = self.cliente.get(URL, {"zona": "mallasa"})
        self.assertEqual([r["nombre"] for r in resp.data["results"]], ["Valle Verde"])

    def test_filtro_precio_rango(self) -> None:
        resp = self.cliente.get(URL, {"precio_min": 1, "precio_max": 50})
        self.assertEqual([r["nombre"] for r in resp.data["results"]], ["Museo Central"])

    def test_filtro_precio_invalido_400(self) -> None:
        resp = self.cliente.get(URL, {"precio_min": "barato"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filtros_combinados(self) -> None:
        resp = self.cliente.get(
            URL, {"categoria": "Cultura", "precio_max": 50, "zona": "san francisco"}
        )
        self.assertEqual(resp.data["count"], 0)
        resp = self.cliente.get(URL, {"categoria": "Cultura", "q": "mirador"})
        self.assertEqual([r["nombre"] for r in resp.data["results"]], ["Mirador Alto"])


class FacetasTests(TestCase):
    def test_facetas_forma_y_conteos(self) -> None:
        cultura = Categoria.objects.create(nombre="Cultura")
        _crear("A Uno", categorias=[cultura], tarifas=[10, 30])
        _crear("B Dos", categorias=[cultura])
        cliente = APIClient()
        resp = cliente.get(f"{URL}facetas/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["total_atractivos"], 2)
        self.assertEqual(resp.data["categorias"][0]["total"], 2)
        self.assertEqual(float(resp.data["precios_bob"]["min"]), 10.0)
        self.assertEqual(float(resp.data["precios_bob"]["max"]), 30.0)
