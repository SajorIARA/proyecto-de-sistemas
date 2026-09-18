from django.core.management import call_command
from django.test import TestCase

from turismo.models import Atractivo, Categoria, Horario, Tarifa, TipoTarifa
from usuarios.models import Rol


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
