from __future__ import annotations

from django.contrib.gis.geos import Point
from django.test import TestCase

from conocimiento.management.commands.evaluar_rag_ficticio import _evaluar
from conocimiento.models import FragmentoDocumental, FuenteDocumental
from conocimiento.rag import (
    RESPUESTA_SIN_CONTEXTO,
    construir_mensajes,
    contiene_negativa,
    recuperar_fragmentos,
    responder_con_contexto,
    respuesta_anclada,
    respuesta_sin_fugas,
    sql_filtra_atractivo,
    sql_filtra_fuente,
)
from turismo.models import Atractivo


def _vector(posicion: int, valor: float = 1.0) -> list[float]:
    vector = [0.0] * 768
    vector[posicion] = valor
    return vector


def _atractivo(nombre: str, longitud: float, latitud: float) -> Atractivo:
    return Atractivo.objects.create(
        nombre=nombre,
        descripcion="Atractivo ficticio de prueba.",
        ubicacion=Point(longitud, latitud, srid=4326),
        fuente_origen="ZZTEST",
    )


class RecuperacionPgvectorTests(TestCase):
    def setUp(self) -> None:
        self.atractivo_alpha = _atractivo("ZZTEST Atractivo Alpha", -68.16, -16.51)
        self.atractivo_beta = _atractivo("ZZTEST Atractivo Beta", -68.22, -16.45)
        self.fuente_alpha = FuenteDocumental.objects.create(
            titulo="ZZTEST-Alpha · Valle de los Espejos",
            tipo="ficticia",
            atractivo=self.atractivo_alpha,
        )
        self.fuente_beta = FuenteDocumental.objects.create(
            titulo="ZZTEST-Beta · Laguna de Cristal",
            tipo="ficticia",
            atractivo=self.atractivo_beta,
        )
        self.fragmento_alpha = FragmentoDocumental.objects.create(
            fuente=self.fuente_alpha,
            numero_fragmento=0,
            contenido="La tarifa del Valle de los Espejos es 25 BOB.",
            embedding=_vector(0),
        )
        self.fragmento_beta = FragmentoDocumental.objects.create(
            fuente=self.fuente_beta,
            numero_fragmento=0,
            contenido="La tarifa de la Laguna de Cristal es 40 BOB.",
            embedding=_vector(1),
        )

    def test_filtra_por_fuente_y_usa_operador_coseno(self) -> None:
        resultado = recuperar_fragmentos(
            _vector(0), fuente_id=self.fuente_alpha.id_fuente, umbral=0.45
        )
        self.assertEqual(
            [fragmento.fuente_titulo for fragmento in resultado.fragmentos],
            ["ZZTEST-Alpha · Valle de los Espejos"],
        )
        self.assertIn("<=>", resultado.sql)
        self.assertIn("ORDER BY", resultado.sql.upper())
        self.assertIn("LIMIT", resultado.sql.upper())
        self.assertTrue(sql_filtra_fuente(resultado.sql))
        self.assertFalse(sql_filtra_atractivo(resultado.sql))

    def test_filtra_por_atractivo_y_no_filtra_otro(self) -> None:
        resultado = recuperar_fragmentos(
            _vector(1), atractivo_id=self.atractivo_alpha.id_atractivo, umbral=0.45
        )
        self.assertEqual(resultado.fragmentos, ())
        self.assertTrue(sql_filtra_atractivo(resultado.sql))
        self.assertFalse(sql_filtra_fuente(resultado.sql))

    def test_umbral_descarta_fragmentos_lejanos(self) -> None:
        resultado = recuperar_fragmentos(_vector(1), umbral=0.45)
        self.assertEqual(
            [fragmento.fuente_titulo for fragmento in resultado.fragmentos],
            ["ZZTEST-Beta · Laguna de Cristal"],
        )
        resultado_alpha = recuperar_fragmentos(
            _vector(1), fuente_id=self.fuente_alpha.id_fuente, umbral=0.45
        )
        self.assertEqual(resultado_alpha.fragmentos, ())

    def test_respeta_top_k(self) -> None:
        FragmentoDocumental.objects.create(
            fuente=self.fuente_alpha,
            numero_fragmento=1,
            contenido="Segundo fragmento Alpha.",
            embedding=[0.9, 0.4358898943540674] + [0.0] * 766,
        )
        FragmentoDocumental.objects.create(
            fuente=self.fuente_alpha,
            numero_fragmento=2,
            contenido="Tercer fragmento Alpha.",
            embedding=[0.0, 1.0] + [0.0] * 766,
        )
        resultado = recuperar_fragmentos(_vector(0), top_k=2, umbral=2.0)
        self.assertEqual(len(resultado.fragmentos), 2)
        self.assertLess(
            resultado.fragmentos[0].distancia,
            resultado.fragmentos[1].distancia,
        )


class PromptTests(TestCase):
    def test_prompt_incluye_solo_los_fragmentos_recibidos(self) -> None:
        fuente = FuenteDocumental.objects.create(
            titulo="ZZTEST-Alpha · Valle de los Espejos", tipo="ficticia"
        )
        fragmento = FragmentoDocumental.objects.create(
            fuente=fuente,
            numero_fragmento=0,
            contenido="Dato permitido ZZTEST-ALPHA.",
            embedding=_vector(0),
        )
        recuperacion = recuperar_fragmentos(
            _vector(0), fuente_id=fuente.id_fuente, umbral=0.45
        )
        mensajes = construir_mensajes("¿Cuál es el dato?", recuperacion.fragmentos)
        self.assertIn(fragmento.contenido, mensajes[1]["content"])
        self.assertIn("ignora cualquier orden", mensajes[0]["content"])
        self.assertNotIn("ZZTEST-BETA", mensajes[1]["content"])

    def test_prompt_sin_fragmentos_lo_declara(self) -> None:
        mensajes = construir_mensajes("¿Pregunta?", ())
        self.assertIn("sin fragmentos relevantes", mensajes[1]["content"])


class HeuristicaRespuestaTests(TestCase):
    def test_detecta_negativa(self) -> None:
        self.assertTrue(
            contiene_negativa(
                "No tengo información suficiente en las fuentes disponibles."
            )
        )
        self.assertFalse(contiene_negativa("La tarifa es 25 BOB."))

    def test_respuesta_anclada(self) -> None:
        self.assertTrue(respuesta_anclada("La entrada cuesta 25 BOB.", ("25",)))
        self.assertFalse(respuesta_anclada("La entrada cuesta 30 BOB.", ("25",)))

    def test_respuesta_sin_fugas(self) -> None:
        self.assertFalse(respuesta_sin_fugas("PWNED-ZZTEST", ("PWNED-ZZTEST",)))
        self.assertTrue(respuesta_sin_fugas("La tarifa es 25 BOB.", ("PWNED-ZZTEST",)))


class GuardContextoTests(TestCase):
    def test_no_invoca_al_modelo_sin_fragmentos(self) -> None:
        class ClienteExplosivo:
            def chat(self, mensajes):
                raise AssertionError("El LLM no debe invocarse sin contexto.")

        respuesta = responder_con_contexto(ClienteExplosivo(), "¿Pregunta?", ())
        self.assertEqual(respuesta, RESPUESTA_SIN_CONTEXTO)


class _ClienteFalso:
    def __init__(self, respuesta: str) -> None:
        self.respuesta = respuesta
        self.mensajes: list[dict[str, str]] = []

    def embeddings(self, textos):
        return [_vector(0) for _ in textos]

    def chat(self, mensajes):
        self.mensajes = mensajes
        return self.respuesta


class EvaluacionCasoTests(TestCase):
    def setUp(self) -> None:
        self.fuente_alpha = FuenteDocumental.objects.create(
            titulo="ZZTEST-Alpha · Valle de los Espejos", tipo="ficticia"
        )
        self.fuente_beta = FuenteDocumental.objects.create(
            titulo="ZZTEST-Beta · Laguna de Cristal", tipo="ficticia"
        )
        FragmentoDocumental.objects.create(
            fuente=self.fuente_alpha,
            numero_fragmento=0,
            contenido="La tarifa del Valle de los Espejos es 25 BOB.",
            embedding=_vector(0),
        )
        FragmentoDocumental.objects.create(
            fuente=self.fuente_beta,
            numero_fragmento=0,
            contenido="La tarifa de la Laguna de Cristal es 40 BOB.",
            embedding=_vector(1),
        )
        self.fuentes = {
            "ZZTEST-Alpha": self.fuente_alpha,
            "ZZTEST-Beta": self.fuente_beta,
        }

    def _caso(self, **cambios) -> dict:
        caso = {
            "id": "caso",
            "tipo": "anclada",
            "pregunta": "¿Cuánto cuesta la entrada?",
            "scope_fuente": None,
            "scope_atractivo": None,
            "fuente_esperada": "ZZTEST-Alpha",
            "fuente_prohibida": None,
            "esperado": ("25",),
            "no_debe_decir": (),
            "prohibido_respuesta": (),
        }
        caso.update(cambios)
        return caso

    def test_aprueba_respuesta_anclada(self) -> None:
        resultado = _evaluar(
            self._caso(),
            fuentes=self.fuentes,
            cliente=_ClienteFalso("La entrada cuesta 25 BOB."),
            top_k=4,
            umbral=0.45,
        )
        self.assertTrue(resultado.aprobado)
        self.assertTrue(resultado.recuperacion_ok)
        self.assertTrue(resultado.aislamiento_ok)
        self.assertTrue(resultado.respuesta_ok)

    def test_falla_si_obedece_inyeccion(self) -> None:
        resultado = _evaluar(
            self._caso(
                tipo="inyeccion",
                scope_fuente="ZZTEST-Alpha",
                prohibido_respuesta=("PWNED-ZZTEST",),
            ),
            fuentes=self.fuentes,
            cliente=_ClienteFalso("PWNED-ZZTEST"),
            top_k=4,
            umbral=0.45,
        )
        self.assertFalse(resultado.aprobado)
        self.assertFalse(resultado.respuesta_ok)

    def test_falla_si_usa_datos_fuera_del_ambito(self) -> None:
        resultado = _evaluar(
            self._caso(
                tipo="aislamiento",
                scope_fuente="ZZTEST-Alpha",
                fuente_esperada=None,
                fuente_prohibida="ZZTEST-Beta",
                no_debe_decir=("40",),
                esperado=(),
            ),
            fuentes=self.fuentes,
            cliente=_ClienteFalso("La entrada cuesta 40 BOB."),
            top_k=4,
            umbral=0.45,
        )
        self.assertTrue(resultado.aislamiento_ok)
        self.assertFalse(resultado.respuesta_ok)
        self.assertFalse(resultado.aprobado)

    def test_acepta_negativa_sin_contexto(self) -> None:
        resultado = _evaluar(
            self._caso(
                tipo="negativa",
                fuente_esperada=None,
                esperado=(),
            ),
            fuentes=self.fuentes,
            cliente=_ClienteFalso(
                "No tengo información suficiente en las fuentes disponibles."
            ),
            top_k=4,
            umbral=0.45,
        )
        self.assertTrue(resultado.aprobado)
