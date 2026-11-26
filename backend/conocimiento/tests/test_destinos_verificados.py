from django.test import TestCase

from conocimiento.destinos_verificados import (
    DESTINOS_LA_PAZ,
    ingestar_destinos_verificados,
)
from conocimiento.models import FuenteDocumental
from turismo.models import Atractivo


class DestinosVerificadosTests(TestCase):
    def test_ingesta_idempotente_y_trazable(self):
        creados, fuentes = ingestar_destinos_verificados()

        self.assertEqual(creados, len(DESTINOS_LA_PAZ))
        self.assertEqual(fuentes, len(DESTINOS_LA_PAZ) * 2)
        self.assertEqual(Atractivo.objects.count(), len(DESTINOS_LA_PAZ))
        self.assertEqual(FuenteDocumental.objects.count(), len(DESTINOS_LA_PAZ) * 2)
        valle = Atractivo.objects.get(nombre="Valle de la Luna")
        self.assertAlmostEqual(valle.ubicacion.x, -68.09444444)
        self.assertAlmostEqual(valle.ubicacion.y, -16.56722222)

        creados, fuentes = ingestar_destinos_verificados()

        self.assertEqual(creados, 0)
        self.assertEqual(fuentes, 0)
        self.assertEqual(FuenteDocumental.objects.count(), len(DESTINOS_LA_PAZ) * 2)
