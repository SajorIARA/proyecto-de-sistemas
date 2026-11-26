"""Calidad de datos: validación admin y comando ``sanealar_catalogo``."""

from __future__ import annotations

from decimal import Decimal
from io import StringIO

from django.contrib.gis.geos import Point
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from recomendaciones.models import UsuarioPreferencia
from turismo.models import Atractivo, AtractivoCategoria, Categoria
from turismo.serializers import AtractivoAdminSerializer
from usuarios.models import Rol, Usuario

UBICACION = {"longitud": -68.1486, "latitud": -16.4966}
ADMIN_URL = "/api/turismo/admin/atractivos/"


def _atractivo(nombre: str, **extra) -> Atractivo:
    datos = {
        "nombre": nombre,
        "descripcion": "Destino de prueba para calidad de datos.",
        "ubicacion": Point(UBICACION["longitud"], UBICACION["latitud"], srid=4326),
    }
    datos.update(extra)
    return Atractivo.objects.create(**datos)


def _payload(**extra) -> dict:
    datos = {
        "nombre": "Destino de prueba",
        "descripcion": "Descripción del destino.",
        "ubicacion": dict(UBICACION),
        "duracion_minutos": 60,
        "activo": True,
        "categorias": [],
    }
    datos.update(extra)
    return datos


class AtractivoAdminCalidadDatosTests(TestCase):
    """La publicación exige categoría activa y duración; el borrador no."""

    def setUp(self) -> None:
        self.categoria = Categoria.objects.create(nombre="Plazas")

    def test_publicar_sin_categoria_devuelve_error_por_campo(self) -> None:
        serializer = AtractivoAdminSerializer(data=_payload(categorias=[]))
        self.assertFalse(serializer.is_valid())
        self.assertIn("activo", serializer.errors)
        self.assertIn("categorias", serializer.errors)
        self.assertNotIn("duracion_minutos", serializer.errors)

    def test_publicar_con_categoria_inactiva_devuelve_error(self) -> None:
        inactiva = Categoria.objects.create(nombre="Cerradas", activo=False)
        serializer = AtractivoAdminSerializer(
            data=_payload(categorias=[inactiva.id_categoria])
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("categorias", serializer.errors)

    def test_publicar_sin_duracion_devuelve_error(self) -> None:
        serializer = AtractivoAdminSerializer(
            data=_payload(
                duracion_minutos=None, categorias=[self.categoria.id_categoria]
            )
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("duracion_minutos", serializer.errors)
        self.assertNotIn("categorias", serializer.errors)

    def test_publicar_completo_es_valido(self) -> None:
        serializer = AtractivoAdminSerializer(
            data=_payload(categorias=[self.categoria.id_categoria])
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_borrador_incompleto_es_valido(self) -> None:
        serializer = AtractivoAdminSerializer(
            data=_payload(activo=False, duracion_minutos=None, categorias=[])
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_reactivar_borrador_incompleto_patch_falla(self) -> None:
        borrador = _atractivo("Borrador", activo=False, duracion_minutos=None)
        serializer = AtractivoAdminSerializer(
            instance=borrador, data={"activo": True}, partial=True
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("activo", serializer.errors)
        self.assertIn("categorias", serializer.errors)
        self.assertIn("duracion_minutos", serializer.errors)

    def test_patch_de_activo_sin_enviar_activo_exige_completitud(self) -> None:
        activo = _atractivo("Sin categoria", duracion_minutos=30)
        serializer = AtractivoAdminSerializer(
            instance=activo, data={"nombre": "Otro nombre"}, partial=True
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("categorias", serializer.errors)

    def test_patch_desactivar_no_exige_completitud(self) -> None:
        activo = _atractivo("Ruido", duracion_minutos=None)
        serializer = AtractivoAdminSerializer(
            instance=activo, data={"activo": False}, partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_post_legado_sin_activo_no_pierde_fixtures_existentes(self) -> None:
        datos = _payload()
        datos.pop("activo")
        datos.pop("categorias")
        serializer = AtractivoAdminSerializer(data=datos)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_post_sin_activo_pero_con_categorias_vacias_falla(self) -> None:
        datos = _payload(categorias=[])
        datos.pop("activo")
        serializer = AtractivoAdminSerializer(data=datos)
        self.assertFalse(serializer.is_valid())
        self.assertIn("categorias", serializer.errors)

    def test_api_publicar_incompleto_devuelve_400(self) -> None:
        usuario = Usuario.objects.create_user(
            email="admin_calidad@test.com", password="clave1234!", nombre="Admin"
        )
        rol, _ = Rol.objects.get_or_create(
            codigo="ADMIN", defaults={"nombre": "Administrador"}
        )
        usuario.roles.add(rol)
        cliente = APIClient()
        respuesta_login = cliente.post(
            "/api/auth/login/",
            {"email": "admin_calidad@test.com", "password": "clave1234!"},
            format="json",
        )
        cliente.credentials(
            HTTP_AUTHORIZATION=f"Bearer {respuesta_login.data['access']}"
        )
        respuesta = cliente.post(ADMIN_URL, _payload(categorias=[]), format="json")
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("categorias", respuesta.data)
        self.assertIn("activo", respuesta.data)


class SanealarCatalogoTests(TestCase):
    """Dry-run sin mutación, aplicación idempotente y sin inventar duraciones."""

    def setUp(self) -> None:
        self.duplicada = Categoria.objects.create(nombre="Mirador")
        self.canonica = Categoria.objects.create(nombre="Miradores")

    @staticmethod
    def _ejecutar(*args) -> str:
        salida = StringIO()
        call_command("sanealar_catalogo", *args, stdout=salida)
        return salida.getvalue()

    def test_dry_run_no_muta(self) -> None:
        ruido = _atractivo("AuditR1c")
        ruido.categorias.add(self.duplicada)
        usuario = Usuario.objects.create_user(
            email="persona@test.com", password="clave1234!", nombre="Persona"
        )
        UsuarioPreferencia.objects.create(
            usuario=usuario, categoria=self.duplicada, nivel_interes=Decimal("0.90")
        )

        salida = self._ejecutar()

        self.assertIn("DRY RUN", salida)
        self.assertIn("AuditR1c", salida)
        ruido.refresh_from_db()
        self.assertTrue(ruido.activo)
        self.assertTrue(ruido.categorias.filter(pk=self.duplicada.pk).exists())
        self.assertTrue(self.duplicada.activo)
        self.assertTrue(
            UsuarioPreferencia.objects.filter(categoria=self.duplicada).exists()
        )

    def test_apply_da_de_baja_solo_ruido_sin_senales(self) -> None:
        ruido = _atractivo("AuditR1c")
        con_url = _atractivo("Con URL", url="https://ejemplo.bo/sitio")
        con_duracion = _atractivo("Con duración", duracion_minutos=30)
        con_categoria = _atractivo("Con categoría")
        con_categoria.categorias.add(self.canonica)
        con_categoria_inactiva = _atractivo("Solo categoría inactiva")
        con_categoria_inactiva.categorias.add(
            Categoria.objects.create(nombre="Antigua", activo=False)
        )

        self._ejecutar("--apply")

        for destino in (ruido, con_categoria_inactiva):
            destino.refresh_from_db()
            self.assertFalse(destino.activo, destino.nombre)
        for destino in (con_url, con_duracion, con_categoria):
            destino.refresh_from_db()
            self.assertTrue(destino.activo, destino.nombre)

    def test_apply_fusiona_categoria_y_preferencias_sin_duplicar(self) -> None:
        con_ambas = _atractivo("Mirador Killi Killi")
        con_ambas.categorias.add(self.duplicada, self.canonica)
        solo_duplicada = _atractivo("Otro mirador")
        solo_duplicada.categorias.add(self.duplicada)

        con_ambas_prefs = Usuario.objects.create_user(
            email="ambas@test.com", password="clave1234!", nombre="Dos preferencias"
        )
        UsuarioPreferencia.objects.create(
            usuario=con_ambas_prefs,
            categoria=self.duplicada,
            nivel_interes=Decimal("0.90"),
        )
        UsuarioPreferencia.objects.create(
            usuario=con_ambas_prefs,
            categoria=self.canonica,
            nivel_interes=Decimal("0.40"),
        )
        solo_duplicada_pref = Usuario.objects.create_user(
            email="una@test.com", password="clave1234!", nombre="Una preferencia"
        )
        UsuarioPreferencia.objects.create(
            usuario=solo_duplicada_pref,
            categoria=self.duplicada,
            nivel_interes=Decimal("0.50"),
        )

        self._ejecutar("--apply")

        for destino in (con_ambas, solo_duplicada):
            categorias = list(destino.categorias.values_list("nombre", flat=True))
            self.assertEqual(categorias, ["Miradores"])
        self.assertFalse(
            AtractivoCategoria.objects.filter(categoria=self.duplicada).exists()
        )

        preferencia = UsuarioPreferencia.objects.get(usuario=con_ambas_prefs)
        self.assertEqual(preferencia.categoria, self.canonica)
        self.assertEqual(preferencia.nivel_interes, Decimal("0.90"))
        otra = UsuarioPreferencia.objects.get(usuario=solo_duplicada_pref)
        self.assertEqual(otra.categoria, self.canonica)
        self.assertEqual(otra.nivel_interes, Decimal("0.50"))
        self.assertFalse(
            UsuarioPreferencia.objects.filter(categoria=self.duplicada).exists()
        )

        self.duplicada.refresh_from_db()
        self.assertFalse(self.duplicada.activo)
        self.assertTrue(Categoria.objects.filter(pk=self.duplicada.pk).exists())

    def test_segunda_ejecucion_apply_no_cambia_nada(self) -> None:
        ruido = _atractivo("AuditR1c")
        con_ambas = _atractivo("Mirador Killi Killi")
        con_ambas.categorias.add(self.duplicada, self.canonica)
        usuario = Usuario.objects.create_user(
            email="idempotente@test.com", password="clave1234!", nombre="Idempotente"
        )
        UsuarioPreferencia.objects.create(
            usuario=usuario, categoria=self.duplicada, nivel_interes=Decimal("0.70")
        )

        self._ejecutar("--apply")
        antes = {
            "ruido_activo": Atractivo.objects.get(pk=ruido.pk).activo,
            "relaciones": list(
                con_ambas.categorias.values_list("id_categoria", flat=True)
            ),
            "preferencias": list(
                UsuarioPreferencia.objects.values_list("categoria_id", "nivel_interes")
            ),
            "duplicada_activa": Categoria.objects.get(pk=self.duplicada.pk).activo,
        }

        salida = self._ejecutar("--apply")

        self.assertIn("Sin cambios pendientes.", salida)
        despues = {
            "ruido_activo": Atractivo.objects.get(pk=ruido.pk).activo,
            "relaciones": list(
                con_ambas.categorias.values_list("id_categoria", flat=True)
            ),
            "preferencias": list(
                UsuarioPreferencia.objects.values_list("categoria_id", "nivel_interes")
            ),
            "duplicada_activa": Categoria.objects.get(pk=self.duplicada.pk).activo,
        }
        self.assertEqual(antes, despues)

    def test_lista_duracion_faltante_sin_inventarla(self) -> None:
        sin_duracion = _atractivo("Mirador sin duración")
        sin_duracion.categorias.add(self.canonica)
        ruido = _atractivo("AuditR1c")

        salida = self._ejecutar("--apply")

        self.assertIn("Mirador sin duración", salida)
        self.assertIn("no se inventa", salida)
        self.assertNotIn("Duración faltante: 'AuditR1c'", salida)
        sin_duracion.refresh_from_db()
        self.assertIsNone(sin_duracion.duracion_minutos)
        self.assertTrue(sin_duracion.activo)
        ruido.refresh_from_db()
        self.assertFalse(ruido.activo)
