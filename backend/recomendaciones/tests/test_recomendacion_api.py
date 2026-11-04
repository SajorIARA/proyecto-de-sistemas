from __future__ import annotations

from decimal import Decimal

from django.contrib.gis.geos import Point
from django.test import TestCase
from rest_framework.test import APIClient

from recomendaciones.models import ConsultaRecomendacion, UsuarioPreferencia
from turismo.models import Atractivo, Categoria, Tarifa, TipoTarifa
from usuarios.models import Usuario

PLAZA_MURILLO = (-68.1330, -16.4957)
SAN_FRANCISCO = (-68.1385, -16.4945)
LEJOS = (-68.1330, -16.6500)


def _crear_attractivo(
    tipo_general: TipoTarifa,
    nombre: str,
    *,
    categoria: Categoria | None = None,
    coordenadas: tuple[float, float] = PLAZA_MURILLO,
    costo: str = "10.00",
    duracion_minutos: int = 60,
) -> Atractivo:
    atractivo = Atractivo.objects.create(
        nombre=nombre,
        descripcion=f"Destino {nombre}",
        ubicacion=Point(coordenadas[0], coordenadas[1], srid=4326),
        duracion_minutos=duracion_minutos,
    )
    if categoria is not None:
        atractivo.categorias.add(categoria)
    Tarifa.objects.create(
        atractivo=atractivo,
        tipo_tarifa=tipo_general,
        monto=Decimal(costo),
        moneda="BOB",
    )
    return atractivo


def _perfil(**extras) -> dict:
    datos = {
        "presupuesto_bob": "100.00",
        "tiempo_horas": "4.00",
        "punto_partida": {"coordinates": list(PLAZA_MURILLO)},
        "radio_km": 15,
        "top_k": 10,
    }
    datos.update(extras)
    return datos


class RecomendacionAPITests(TestCase):
    """Contrato HTTP del motor de recomendación (issue #27)."""

    @classmethod
    def setUpTestData(cls) -> None:
        cls.tipo_general = TipoTarifa.objects.create(
            codigo="GENERAL",
            nombre="General",
        )
        cls.cultura = Categoria.objects.create(nombre="Cultura")
        cls.naturaleza = Categoria.objects.create(nombre="Naturaleza")

    def setUp(self) -> None:
        self.usuario = Usuario.objects.create_user(
            email="motor@example.com",
            password="clave1234!",
            nombre="Turista Motor",
        )
        self.cliente = APIClient()
        self.cliente.force_authenticate(user=self.usuario)

    def test_endpoint_recomendations_devuelve_top_k(self) -> None:
        primero = _crear_attractivo(
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
        respuesta = self.cliente.post(
            "/api/recommendations/",
            _perfil(preferencias={"Cultura": "1.00"}, top_k=1),
            format="json",
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data["top_k"], 1)
        self.assertEqual(respuesta.data["total_recomendaciones"], 1)
        self.assertEqual(
            respuesta.data["recomendaciones"][0]["id_atractivo"],
            str(primero.pk),
        )
        self.assertEqual(ConsultaRecomendacion.objects.count(), 1)

    def test_alias_en_espanol(self) -> None:
        _crear_attractivo(self.tipo_general, "Museo", categoria=self.cultura)
        respuesta = self.cliente.post(
            "/api/recomendaciones/recomendar/",
            _perfil(),
            format="json",
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.data["recomendaciones"]), 1)

    def test_usa_preferencias_persistidas_si_no_se_envian(self) -> None:
        UsuarioPreferencia.objects.create(
            usuario=self.usuario,
            categoria=self.cultura,
            nivel_interes=Decimal("1.00"),
        )
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

        respuesta = self.cliente.post(
            "/api/recommendations/",
            _perfil(),
            format="json",
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(
            respuesta.data["recomendaciones"][0]["id_atractivo"],
            str(cultural.id_atractivo),
        )

    def test_preferencias_explicitas_reemplazan_al_perfil(self) -> None:
        UsuarioPreferencia.objects.create(
            usuario=self.usuario,
            categoria=self.cultura,
            nivel_interes=Decimal("1.00"),
        )
        _crear_attractivo(
            self.tipo_general,
            "Museo",
            categoria=self.cultura,
            coordenadas=SAN_FRANCISCO,
        )
        natural = _crear_attractivo(
            self.tipo_general,
            "Mirador",
            categoria=self.naturaleza,
            coordenadas=SAN_FRANCISCO,
        )

        respuesta = self.cliente.post(
            "/api/recommendations/",
            _perfil(preferencias={"Naturaleza": "1.00"}),
            format="json",
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(
            respuesta.data["recomendaciones"][0]["id_atractivo"],
            str(natural.id_atractivo),
        )

    def test_filtros_duros_y_penalizacion_de_tiempo(self) -> None:
        barato = _crear_attractivo(self.tipo_general, "Barato")
        _crear_attractivo(self.tipo_general, "Caro", costo="500.00")
        _crear_attractivo(self.tipo_general, "Lejos", coordenadas=LEJOS)
        largo = _crear_attractivo(
            self.tipo_general,
            "Largo",
            coordenadas=SAN_FRANCISCO,
            duracion_minutos=600,
        )

        respuesta = self.cliente.post(
            "/api/recommendations/",
            _perfil(tiempo_horas="1.00"),
            format="json",
        )

        self.assertEqual(respuesta.status_code, 200)
        ids = [item["id_atractivo"] for item in respuesta.data["recomendaciones"]]
        self.assertIn(str(barato.id_atractivo), ids)
        self.assertIn(str(largo.id_atractivo), ids)
        self.assertEqual(len(ids), 2)
        item_largo = next(
            item
            for item in respuesta.data["recomendaciones"]
            if item["id_atractivo"] == str(largo.id_atractivo)
        )
        self.assertIn("tiempo_excedido", item_largo["motivos"])

    def test_persiste_la_consulta_con_el_usuario_del_jwt(self) -> None:
        _crear_attractivo(self.tipo_general, "Museo")
        respuesta = self.cliente.post(
            "/api/recommendations/",
            _perfil(macrodistrito="Centro"),
            format="json",
        )

        self.assertEqual(respuesta.status_code, 200)
        consulta = ConsultaRecomendacion.objects.get()
        self.assertEqual(consulta.usuario, self.usuario)
        self.assertEqual(consulta.presupuesto_bob, Decimal("100.00"))
        self.assertEqual(consulta.tiempo_horas, Decimal("4.00"))
        self.assertEqual(consulta.macrodistrito, "Centro")
        self.assertEqual(str(consulta.id_consulta), respuesta.data["id_consulta"])

    def test_sin_candidatos_devuelve_arreglo_vacio(self) -> None:
        respuesta = self.cliente.post(
            "/api/recommendations/",
            _perfil(),
            format="json",
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data["recomendaciones"], [])
        self.assertEqual(respuesta.data["total_recomendaciones"], 0)

    def test_resultado_es_determinista(self) -> None:
        for indice in range(4):
            _crear_attractivo(self.tipo_general, f"Destino {indice}")

        primera = self.cliente.post(
            "/api/recommendations/",
            _perfil(),
            format="json",
        )
        segunda = self.cliente.post(
            "/api/recommendations/",
            _perfil(),
            format="json",
        )

        ids_primera = [i["id_atractivo"] for i in primera.data["recomendaciones"]]
        ids_segunda = [i["id_atractivo"] for i in segunda.data["recomendaciones"]]
        self.assertEqual(ids_primera, ids_segunda)

    def test_requiere_autenticacion(self) -> None:
        respuesta = APIClient().post(
            "/api/recommendations/",
            _perfil(),
            format="json",
        )

        self.assertIn(respuesta.status_code, (401, 403))

    def test_valida_el_perfil(self) -> None:
        casos = [
            _perfil(presupuesto_bob="-1.00"),
            _perfil(tiempo_horas="0.00"),
            _perfil(punto_partida={"coordinates": [-70.0, -16.5]}),
            _perfil(punto_partida={"coordinates": [-68.1]}),
            _perfil(radio_km=0),
            _perfil(radio_km=51),
            _perfil(top_k=0),
            _perfil(top_k=51),
            _perfil(preferencias={"Cultura": "1.50"}),
            _perfil(preferencias={" ": "1.00"}),
        ]

        for datos in casos:
            with self.subTest(datos=datos):
                respuesta = self.cliente.post(
                    "/api/recommendations/",
                    datos,
                    format="json",
                )
                self.assertEqual(respuesta.status_code, 400)
