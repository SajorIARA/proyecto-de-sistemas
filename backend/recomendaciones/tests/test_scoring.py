from __future__ import annotations

from decimal import Decimal

from django.test import SimpleTestCase

from recomendaciones.scoring import (
    AtractivoCandidato,
    ConfiguracionPonderacion,
    PerfilTuristico,
    Puntuador,
    distancia_haversine_km,
    rankear_atractivos,
)

# Coordenadas reales de La Paz para los perfiles simulados (lat, lon).
PLAZA_MURILLO = (-16.4957, -68.1330)
VALLE_LUNA = (-16.5333, -68.1167)
TELEFERICO = (-16.5167, -68.1167)
MUSEO_ETNOGRAFIA = (-16.4960, -68.1340)
CHACALTAYA = (-16.3536, -68.1297)
TIWANAKU = (-16.5547, -68.6733)


def _atractivo(
    id_atractivo: str,
    nombre: str,
    categorias: tuple[str, ...],
    costo: str,
    duracion: str,
    coordenadas: tuple[float, float],
) -> AtractivoCandidato:
    return AtractivoCandidato(
        id_atractivo=id_atractivo,
        nombre=nombre,
        categorias=frozenset(categorias),
        costo_bob=Decimal(costo),
        duracion_horas=Decimal(duracion),
        latitud=coordenadas[0],
        longitud=coordenadas[1],
    )


TELEFERICO_CANDIDATO = _atractivo(
    "teleferico",
    "Mi Teleférico",
    ("Aventura",),
    "10.00",
    "1.00",
    TELEFERICO,
)
VALLE_LUNA_CANDIDATO = _atractivo(
    "valle-luna",
    "Valle de la Luna",
    ("Naturaleza",),
    "50.00",
    "2.00",
    VALLE_LUNA,
)
MUSEO_CANDIDATO = _atractivo(
    "museo",
    "Museo de Etnografía",
    ("Cultura",),
    "20.00",
    "1.50",
    MUSEO_ETNOGRAFIA,
)
CHACALTAYA_CANDIDATO = _atractivo(
    "chacaltaya",
    "Chacaltaya",
    ("Aventura", "Naturaleza"),
    "200.00",
    "5.00",
    CHACALTAYA,
)
TIWANAKU_CANDIDATO = _atractivo(
    "tiwanaku",
    "Tiwanaku",
    ("Historia",),
    "100.00",
    "4.00",
    TIWANAKU,
)


class DistanciaHaversineTests(SimpleTestCase):
    def test_distancia_entre_mismo_punto_es_cero(self) -> None:
        self.assertEqual(distancia_haversine_km(*PLAZA_MURILLO, *PLAZA_MURILLO), 0.0)

    def test_distancia_plaza_murillo_valle_luna(self) -> None:
        distancia = distancia_haversine_km(*PLAZA_MURILLO, *VALLE_LUNA)
        self.assertGreater(distancia, 4.0)
        self.assertLess(distancia, 6.0)

    def test_distancia_es_simetrica(self) -> None:
        ida = distancia_haversine_km(*PLAZA_MURILLO, *TIWANAKU)
        vuelta = distancia_haversine_km(*TIWANAKU, *PLAZA_MURILLO)
        self.assertAlmostEqual(ida, vuelta, places=6)


class ConfiguracionPonderacionTests(SimpleTestCase):
    def test_matriz_por_defecto(self) -> None:
        config = ConfiguracionPonderacion()
        self.assertEqual(
            config.matriz,
            {
                "categoria": 0.40,
                "distancia": 0.25,
                "presupuesto": 0.20,
                "tiempo": 0.15,
            },
        )

    def test_pesos_deben_sumar_uno(self) -> None:
        with self.assertRaisesRegex(ValueError, "sumar 1.0"):
            ConfiguracionPonderacion(peso_categoria=0.50)

    def test_pesos_no_pueden_ser_negativos(self) -> None:
        with self.assertRaisesRegex(ValueError, "negativos"):
            ConfiguracionPonderacion(
                peso_categoria=-0.10,
                peso_distancia=0.40,
                peso_presupuesto=0.40,
                peso_tiempo=0.30,
            )

    def test_factores_de_penalizacion_en_rango(self) -> None:
        for factor in (-0.01, 1.01):
            with self.subTest(factor=factor):
                with self.assertRaisesRegex(ValueError, "entre 0.0 y 1.0"):
                    ConfiguracionPonderacion(factor_fuera_presupuesto=factor)

    def test_radio_positivo(self) -> None:
        with self.assertRaisesRegex(ValueError, "radio_km"):
            ConfiguracionPonderacion(radio_km=0)


class PuntuadorTests(SimpleTestCase):
    def setUp(self) -> None:
        self.puntuador = Puntuador()

    def test_atractivo_ideal_obtiene_puntaje_alto(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("500.00"),
            tiempo_horas=Decimal("8.00"),
            latitud=TELEFERICO[0],
            longitud=TELEFERICO[1],
            preferencias={"Aventura": Decimal("1.00")},
        )
        puntuacion = self.puntuador.puntuar(perfil, TELEFERICO_CANDIDATO)

        self.assertAlmostEqual(puntuacion.afinidad_categoria, 1.0)
        self.assertAlmostEqual(puntuacion.proximidad, 1.0)
        self.assertAlmostEqual(puntuacion.holgura_presupuesto, 0.98)
        self.assertAlmostEqual(puntuacion.holgura_tiempo, 0.875)
        self.assertAlmostEqual(puntuacion.puntaje, 0.97725)
        self.assertTrue(puntuacion.viable)
        self.assertFalse(puntuacion.excluido)
        self.assertEqual(puntuacion.motivos, ())

    def test_afinidad_pondera_el_nivel_de_interes(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("4.00"),
            latitud=TELEFERICO[0],
            longitud=TELEFERICO[1],
            preferencias={
                "Aventura": Decimal("0.90"),
                "Cultura": Decimal("0.30"),
            },
        )
        aventura = self.puntuador.puntuar(perfil, TELEFERICO_CANDIDATO)
        cultura = self.puntuador.puntuar(perfil, MUSEO_CANDIDATO)

        self.assertAlmostEqual(aventura.afinidad_categoria, 0.75)
        self.assertAlmostEqual(cultura.afinidad_categoria, 0.25)
        self.assertGreater(aventura.puntaje, cultura.puntaje)

    def test_sin_preferencias_no_hay_afinidad(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("4.00"),
            latitud=TELEFERICO[0],
            longitud=TELEFERICO[1],
        )
        puntuacion = self.puntuador.puntuar(perfil, TELEFERICO_CANDIDATO)
        self.assertEqual(puntuacion.afinidad_categoria, 0.0)

    def test_la_distancia_reduce_la_proximidad(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("500.00"),
            tiempo_horas=Decimal("8.00"),
            latitud=PLAZA_MURILLO[0],
            longitud=PLAZA_MURILLO[1],
            preferencias={"Aventura": Decimal("1.00")},
        )
        cercano = self.puntuador.puntuar(perfil, TELEFERICO_CANDIDATO)
        lejano = self.puntuador.puntuar(perfil, CHACALTAYA_CANDIDATO)

        self.assertGreater(cercano.proximidad, lejano.proximidad)
        self.assertEqual(lejano.proximidad, 0.0)
        self.assertGreater(cercano.puntaje, lejano.puntaje)

    def test_fuera_de_presupuesto_penaliza_pero_sigue_rankeable(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("8.00"),
            latitud=CHACALTAYA[0],
            longitud=CHACALTAYA[1],
            preferencias={"Aventura": Decimal("1.00")},
        )
        puntuacion = self.puntuador.puntuar(perfil, CHACALTAYA_CANDIDATO)

        self.assertIn("presupuesto_excedido", puntuacion.motivos)
        self.assertFalse(puntuacion.viable)
        self.assertFalse(puntuacion.excluido)
        self.assertEqual(puntuacion.factor_penalizacion, 0.30)
        self.assertGreater(puntuacion.puntaje, 0.0)
        self.assertLess(puntuacion.puntaje, 0.40)

    def test_fuera_de_tiempo_penaliza(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("500.00"),
            tiempo_horas=Decimal("3.00"),
            latitud=CHACALTAYA[0],
            longitud=CHACALTAYA[1],
            preferencias={"Aventura": Decimal("1.00")},
        )
        puntuacion = self.puntuador.puntuar(perfil, CHACALTAYA_CANDIDATO)

        self.assertIn("tiempo_excedido", puntuacion.motivos)
        self.assertFalse(puntuacion.viable)
        self.assertEqual(puntuacion.holgura_tiempo, 0.0)
        self.assertEqual(puntuacion.factor_penalizacion, 0.30)

    def test_penalizaciones_son_configurables(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("8.00"),
            latitud=CHACALTAYA[0],
            longitud=CHACALTAYA[1],
            preferencias={"Aventura": Decimal("1.00")},
        )
        suave = Puntuador(
            ConfiguracionPonderacion(factor_fuera_presupuesto=0.80)
        ).puntuar(perfil, CHACALTAYA_CANDIDATO)
        dura = Puntuador(
            ConfiguracionPonderacion(factor_fuera_presupuesto=0.10)
        ).puntuar(perfil, CHACALTAYA_CANDIDATO)

        self.assertGreater(suave.puntaje, dura.puntaje)
        self.assertAlmostEqual(suave.puntaje / dura.puntaje, 8.0, places=5)

    def test_filtros_estrictos_excluyen_fuera_de_presupuesto_o_tiempo(self) -> None:
        config = ConfiguracionPonderacion(filtros_estrictos=True)
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("100.00"),
            tiempo_horas=Decimal("3.00"),
            latitud=CHACALTAYA[0],
            longitud=CHACALTAYA[1],
            preferencias={"Aventura": Decimal("1.00")},
        )
        puntuacion = Puntuador(config).puntuar(perfil, CHACALTAYA_CANDIDATO)

        self.assertTrue(puntuacion.excluido)
        self.assertFalse(puntuacion.viable)
        self.assertEqual(puntuacion.puntaje, 0.0)
        self.assertEqual(
            set(puntuacion.motivos),
            {"presupuesto_excedido", "tiempo_excedido"},
        )

    def test_validaciones_de_perfil(self) -> None:
        with self.assertRaisesRegex(ValueError, "presupuesto_bob"):
            PerfilTuristico(
                presupuesto_bob=Decimal("-1.00"),
                tiempo_horas=Decimal("2.00"),
                latitud=0.0,
                longitud=0.0,
            )
        with self.assertRaisesRegex(ValueError, "tiempo_horas"):
            PerfilTuristico(
                presupuesto_bob=Decimal("1.00"),
                tiempo_horas=Decimal("0.00"),
                latitud=0.0,
                longitud=0.0,
            )
        with self.assertRaisesRegex(ValueError, "nivel de interés"):
            PerfilTuristico(
                presupuesto_bob=Decimal("1.00"),
                tiempo_horas=Decimal("1.00"),
                latitud=0.0,
                longitud=0.0,
                preferencias={"Aventura": Decimal("1.50")},
            )

    def test_validaciones_de_atractivo(self) -> None:
        with self.assertRaisesRegex(ValueError, "costo_bob"):
            _atractivo("x", "X", (), "-1.00", "1.00", PLAZA_MURILLO)
        with self.assertRaisesRegex(ValueError, "duracion_horas"):
            _atractivo("x", "X", (), "1.00", "-1.00", PLAZA_MURILLO)

    def test_top_k_y_desempate_por_distancia(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("500.00"),
            tiempo_horas=Decimal("8.00"),
            latitud=PLAZA_MURILLO[0],
            longitud=PLAZA_MURILLO[1],
            preferencias={"Aventura": Decimal("1.00")},
        )
        candidatos = [
            _atractivo("lejos", "Lejos", ("Aventura",), "10.00", "1.00", CHACALTAYA),
            TELEFERICO_CANDIDATO,
            _atractivo("cerca", "Cerca", ("Aventura",), "10.00", "1.00", PLAZA_MURILLO),
        ]
        ranking = self.puntuador.rankear(perfil, candidatos, top_k=2)

        self.assertEqual(len(ranking), 2)
        self.assertEqual([p.id_atractivo for p in ranking], ["cerca", "teleferico"])

    def test_top_k_negativo_falla(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("10.00"),
            tiempo_horas=Decimal("1.00"),
            latitud=0.0,
            longitud=0.0,
        )
        with self.assertRaisesRegex(ValueError, "top_k"):
            self.puntuador.rankear(perfil, [TELEFERICO_CANDIDATO], top_k=-1)


class PerfilesSimuladosLaPazTests(SimpleTestCase):
    """Validación cruzada del DoD con turistas simulados en La Paz."""

    def test_perfil_aventura_con_bajo_presupuesto(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("150.00"),
            tiempo_horas=Decimal("4.00"),
            latitud=PLAZA_MURILLO[0],
            longitud=PLAZA_MURILLO[1],
            preferencias={
                "Aventura": Decimal("0.90"),
                "Naturaleza": Decimal("0.50"),
            },
        )
        ranking = rankear_atractivos(
            perfil,
            [
                TELEFERICO_CANDIDATO,
                VALLE_LUNA_CANDIDATO,
                MUSEO_CANDIDATO,
                CHACALTAYA_CANDIDATO,
            ],
        )

        self.assertEqual(ranking[0].id_atractivo, "teleferico")
        self.assertEqual(ranking[1].id_atractivo, "valle-luna")
        self.assertTrue(ranking[0].viable)
        self.assertTrue(ranking[1].viable)
        self.assertEqual(ranking[-1].id_atractivo, "chacaltaya")
        self.assertIn("presupuesto_excedido", ranking[-1].motivos)
        self.assertIn("tiempo_excedido", ranking[-1].motivos)

    def test_perfil_cultural_con_presupuesto_medio(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("300.00"),
            tiempo_horas=Decimal("6.00"),
            latitud=MUSEO_ETNOGRAFIA[0],
            longitud=MUSEO_ETNOGRAFIA[1],
            preferencias={
                "Cultura": Decimal("1.00"),
                "Historia": Decimal("0.50"),
            },
        )
        ranking = rankear_atractivos(
            perfil,
            [MUSEO_CANDIDATO, TIWANAKU_CANDIDATO, TELEFERICO_CANDIDATO],
        )

        self.assertEqual(ranking[0].id_atractivo, "museo")
        self.assertTrue(all(p.viable for p in ranking))
        self.assertEqual(ranking[0].motivos, ())

    def test_filtro_estricto_descarta_todo_lo_inviable(self) -> None:
        perfil = PerfilTuristico(
            presupuesto_bob=Decimal("150.00"),
            tiempo_horas=Decimal("4.00"),
            latitud=PLAZA_MURILLO[0],
            longitud=PLAZA_MURILLO[1],
            preferencias={"Aventura": Decimal("1.00")},
        )
        ranking = Puntuador(ConfiguracionPonderacion(filtros_estrictos=True)).rankear(
            perfil,
            [
                TELEFERICO_CANDIDATO,
                VALLE_LUNA_CANDIDATO,
                CHACALTAYA_CANDIDATO,
            ],
        )

        viables = [p for p in ranking if p.viable]
        excluidos = [p for p in ranking if p.excluido]
        self.assertEqual(
            [p.id_atractivo for p in viables], ["teleferico", "valle-luna"]
        )
        self.assertEqual([p.id_atractivo for p in excluidos], ["chacaltaya"])
        self.assertEqual(excluidos[0].puntaje, 0.0)
