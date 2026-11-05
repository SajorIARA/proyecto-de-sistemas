from __future__ import annotations

from decimal import Decimal

from django.contrib.gis.geos import Point
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from recomendaciones.services import candidatos_cercanos, recomendar
from turismo.models import Atractivo, Categoria, Tarifa, TipoTarifa

PLAZA_MURILLO = (-68.1330, -16.4957)
SAN_FRANCISCO = (-68.1385, -16.4945)
LEJOS = (-68.1330, -16.6500)


def _crear_attractivo(
    tipo_general: TipoTarifa,
    nombre: str,
    *,
    categoria: Categoria | None = None,
    coordenadas: tuple[float, float] = PLAZA_MURILLO,
    tarifas: tuple[str, ...] = ("10.00",),
    duracion_minutos: int = 60,
    activo: bool = True,
) -> Atractivo:
    atractivo = Atractivo.objects.create(
        nombre=nombre,
        descripcion=f"Destino {nombre}",
        ubicacion=Point(coordenadas[0], coordenadas[1], srid=4326),
        duracion_minutos=duracion_minutos,
        activo=activo,
    )
    if categoria is not None:
        atractivo.categorias.add(categoria)
    for monto in tarifas:
        Tarifa.objects.create(
            atractivo=atractivo,
            tipo_tarifa=tipo_general,
            monto=Decimal(monto),
            moneda="BOB",
        )
    return atractivo


def _punto(coordenadas: tuple[float, float]) -> Point:
    return Point(coordenadas[0], coordenadas[1], srid=4326)


class ServicioRecomendacionTests(TestCase):
    """Filtros duros, PostGIS y ranking determinista (issue #27)."""

    @classmethod
    def setUpTestData(cls) -> None:
        cls.tipo_general = TipoTarifa.objects.create(
            codigo="GENERAL",
            nombre="General",
        )
        cls.cultura = Categoria.objects.create(nombre="Cultura")
        cls.naturaleza = Categoria.objects.create(nombre="Naturaleza")

    def test_filtra_por_presupuesto_usando_tarifa_minima(self) -> None:
        barato = _crear_attractivo(
            self.tipo_general, "Barato", tarifas=("10.00", "30.00")
        )
        _crear_attractivo(self.tipo_general, "Caro", tarifas=("100.00",))

        resultado = recomendar(
            presupuesto_bob=Decimal("20.00"),
            tiempo_horas=Decimal("4.00"),
            punto_partida=_punto(PLAZA_MURILLO),
        )

        self.assertEqual(
            [r.puntuacion.id_atractivo for r in resultado.recomendaciones],
            [str(barato.id_atractivo)],
        )
        self.assertEqual(resultado.recomendaciones[0].costo_bob, Decimal("10.00"))

    def test_filtra_por_radio_espacial(self) -> None:
        cerca = _crear_attractivo(self.tipo_general, "Cerca", coordenadas=SAN_FRANCISCO)
        _crear_attractivo(self.tipo_general, "Lejos", coordenadas=LEJOS)

        resultado = recomendar(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("4.00"),
            punto_partida=_punto(PLAZA_MURILLO),
            radio_km=5,
        )

        self.assertEqual(
            [r.puntuacion.id_atractivo for r in resultado.recomendaciones],
            [str(cerca.id_atractivo)],
        )

    def test_distancia_se_calcula_con_postgis(self) -> None:
        _crear_attractivo(self.tipo_general, "San Francisco", coordenadas=SAN_FRANCISCO)

        with CaptureQueriesContext(connection) as consultas:
            candidatos = candidatos_cercanos(
                punto_partida=_punto(PLAZA_MURILLO),
                presupuesto_bob=Decimal("100.00"),
                radio_km=15,
            )

        sql = " ".join(consulta["sql"] for consulta in consultas.captured_queries)
        self.assertIn("ST_DistanceSphere", sql)
        self.assertEqual(len(candidatos), 1)
        self.assertGreater(candidatos[0].distancia_m, 400)
        self.assertLess(candidatos[0].distancia_m, 900)

    def test_sin_tarifa_se_considera_gratuito(self) -> None:
        gratis = _crear_attractivo(self.tipo_general, "Gratuito", tarifas=())

        resultado = recomendar(
            presupuesto_bob=Decimal("0.00"),
            tiempo_horas=Decimal("2.00"),
            punto_partida=_punto(PLAZA_MURILLO),
        )

        self.assertEqual(
            [r.puntuacion.id_atractivo for r in resultado.recomendaciones],
            [str(gratis.id_atractivo)],
        )
        self.assertEqual(resultado.recomendaciones[0].costo_bob, Decimal("0.00"))

    def test_preferencia_de_categoria_ordena_primero(self) -> None:
        cultural = _crear_attractivo(
            self.tipo_general,
            "Museo",
            categoria=self.cultura,
            coordenadas=SAN_FRANCISCO,
        )
        _crear_attractivo(
            self.tipo_general,
            "Mirador",
            categoria=self.naturaleza,
            coordenadas=SAN_FRANCISCO,
        )

        resultado = recomendar(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("4.00"),
            punto_partida=_punto(PLAZA_MURILLO),
            preferencias={"Cultura": Decimal("1.00")},
        )

        self.assertEqual(
            resultado.recomendaciones[0].puntuacion.id_atractivo,
            str(cultural.id_atractivo),
        )
        self.assertEqual(
            resultado.recomendaciones[0].puntuacion.afinidad_categoria,
            1.0,
        )

    def test_tiempo_excedido_penaliza_pero_no_excluye(self) -> None:
        _crear_attractivo(self.tipo_general, "Largo", duracion_minutos=300)

        resultado = recomendar(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("2.00"),
            punto_partida=_punto(PLAZA_MURILLO),
        )

        self.assertEqual(len(resultado.recomendaciones), 1)
        puntuacion = resultado.recomendaciones[0].puntuacion
        self.assertIn("tiempo_excedido", puntuacion.motivos)
        self.assertFalse(puntuacion.viable)
        self.assertGreater(puntuacion.puntaje, 0.0)

    def test_top_k_y_determinismo(self) -> None:
        for indice in range(5):
            _crear_attractivo(self.tipo_general, f"Destino {indice}")

        primero = recomendar(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("4.00"),
            punto_partida=_punto(PLAZA_MURILLO),
            top_k=3,
        )
        segundo = recomendar(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("4.00"),
            punto_partida=_punto(PLAZA_MURILLO),
            top_k=3,
        )

        ids_primero = [r.puntuacion.id_atractivo for r in primero.recomendaciones]
        ids_segundo = [r.puntuacion.id_atractivo for r in segundo.recomendaciones]
        self.assertEqual(len(ids_primero), 3)
        self.assertEqual(ids_primero, ids_segundo)
        puntajes = [r.puntuacion.puntaje for r in primero.recomendaciones]
        self.assertEqual(puntajes, sorted(puntajes, reverse=True))

    def test_atractivos_inactivos_no_participan(self) -> None:
        _crear_attractivo(self.tipo_general, "Inactivo", activo=False)

        resultado = recomendar(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("4.00"),
            punto_partida=_punto(PLAZA_MURILLO),
        )

        self.assertEqual(resultado.recomendaciones, ())
        self.assertEqual(resultado.total_activos, 0)

    def test_validaciones_de_parametros(self) -> None:
        with self.assertRaisesRegex(ValueError, "radio_km"):
            recomendar(
                presupuesto_bob=Decimal("10.00"),
                tiempo_horas=Decimal("1.00"),
                punto_partida=_punto(PLAZA_MURILLO),
                radio_km=0,
            )
        with self.assertRaisesRegex(ValueError, "top_k"):
            recomendar(
                presupuesto_bob=Decimal("10.00"),
                tiempo_horas=Decimal("1.00"),
                punto_partida=_punto(PLAZA_MURILLO),
                top_k=0,
            )
