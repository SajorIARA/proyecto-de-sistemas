from django.core.management import call_command
from django.test import TestCase

from turismo.models import Atractivo, Categoria, Horario, Tarifa, TipoTarifa
from usuarios.models import Rol, Usuario


class SeedTests(TestCase):
    def test_seed_es_idempotente(self):
        call_command("seed")
        call_command("seed")

        self.assertGreaterEqual(Rol.objects.count(), 2)
        self.assertGreaterEqual(TipoTarifa.objects.count(), 4)
        self.assertGreaterEqual(Categoria.objects.count(), 6)

        categorias_requeridas = {
            "Aventura",
            "Gastronomía",
            "Cultura",
            "Miradores",
            "Naturaleza",
            "Arqueología",
        }

        categorias_existentes = set(Categoria.objects.values_list("nombre", flat=True))

        self.assertTrue(categorias_requeridas.issubset(categorias_existentes))

        self.assertGreaterEqual(Atractivo.objects.count(), 5)
        self.assertGreaterEqual(Horario.objects.count(), 5)
        self.assertGreaterEqual(Tarifa.objects.count(), 4)

    def test_seed_demo_tiene_rol_y_login(self):
        from rest_framework.test import APIClient

        call_command("seed")
        usuario = Usuario.objects.get(email="demo.turista@example.com")
        self.assertTrue(usuario.roles.filter(codigo="TOURIST").exists())
        resp = APIClient().post(
            "/api/auth/login/",
            {"email": "demo.turista@example.com", "password": "demo1234!"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
