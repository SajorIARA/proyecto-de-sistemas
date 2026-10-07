from __future__ import annotations

import tempfile
from pathlib import Path
from unittest import mock

from django.contrib.gis.geos import Point
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from turismo.models import Atractivo, Foto
from turismo.tasks import purgar_staging, subir_foto_task
from usuarios.models import Rol, Usuario

SUBIR_URL = "/api/turismo/admin/fotos/subir/"


def _admin() -> APIClient:
    cliente = APIClient()
    usuario = Usuario.objects.create_user(
        email="admin_async@test.com", password="Clave99!", nombre="Admin Async"
    )
    rol, _ = Rol.objects.get_or_create(
        codigo="ADMIN", defaults={"nombre": "Administrador"}
    )
    usuario.roles.add(rol)
    resp = cliente.post(
        "/api/auth/login/",
        {"email": "admin_async@test.com", "password": "Clave99!"},
        format="json",
    )
    cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return cliente


def _atractivo() -> Atractivo:
    return Atractivo.objects.create(
        nombre="Async Test",
        descripcion="Atractivo",
        ubicacion=Point(-68.14, -16.49, srid=4326),
    )


class SubirFotoViewTests(TestCase):
    def setUp(self) -> None:
        self.cliente = _admin()
        self.atractivo = _atractivo()

    def _archivo(self, nombre: str = "foto.jpg", contenido: bytes = b"0123456789"):
        from django.core.files.uploadedfile import SimpleUploadedFile

        return SimpleUploadedFile(nombre, contenido, content_type="image/jpeg")

    def test_subir_encola_y_responde_202(self) -> None:
        with (
            tempfile.TemporaryDirectory() as tmp,
            override_settings(STAGING_DIR=tmp),
            mock.patch.object(subir_foto_task, "delay") as mock_delay,
        ):
            resp = self.cliente.post(
                SUBIR_URL,
                {
                    "atractivo": str(self.atractivo.id_atractivo),
                    "archivo": self._archivo(),
                },
                format="multipart",
            )
            self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
            self.assertEqual(resp.data["estado"], Foto.ESTADO_PENDING)
            foto = Foto.objects.get(pk=resp.data["id_foto"])
            self.assertEqual(foto.estado, Foto.ESTADO_PENDING)
            mock_delay.assert_called_once()
            self.assertTrue((Path(tmp) / f"foto-{foto.id_foto}.jpg").is_file())

    def test_subir_sin_archivo_400(self) -> None:
        resp = self.cliente.post(
            SUBIR_URL,
            {"atractivo": str(self.atractivo.id_atractivo)},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_subir_extension_invalida_400(self) -> None:
        resp = self.cliente.post(
            SUBIR_URL,
            {
                "atractivo": str(self.atractivo.id_atractivo),
                "archivo": self._archivo("virus.exe", b"MZ"),
            },
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_subir_peso_excedido_400(self) -> None:
        grande = b"0" * (11 * 1024 * 1024)
        resp = self.cliente.post(
            SUBIR_URL,
            {
                "atractivo": str(self.atractivo.id_atractivo),
                "archivo": self._archivo("grande.jpg", grande),
            },
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_estado_inexistente_404(self) -> None:
        resp = self.cliente.get("/api/turismo/admin/fotos/999999/estado/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class SubirFotoTaskTests(TestCase):
    def test_tarea_completa_y_limpia_temporal(self) -> None:
        atractivo = _atractivo()
        with tempfile.TemporaryDirectory() as tmp:
            ruta = Path(tmp) / "foto-1.jpg"
            ruta.write_bytes(b"0123456789")
            foto = Foto.objects.create(
                atractivo=atractivo,
                public_id="turismo/pending/x",
                tipo=Foto.TIPO_IMAGEN,
            )
            with override_settings(STAGING_DIR=tmp):
                falso_uploader = mock.MagicMock()
                falso_uploader.upload.return_value = {
                    "public_id": "atractivos/1-async-test/abc",
                    "secure_url": "https://res.cloudinary.com/d/abc.jpg",
                    "width": 800,
                    "height": 600,
                }
                with (
                    mock.patch.dict(
                        "django.conf.settings.CLOUDINARY",
                        {
                            "cloud_name": "test",
                            "api_key": "k",
                            "api_secret": "s",
                        },
                        clear=False,
                    ),
                    mock.patch.dict(
                        "sys.modules", {"cloudinary.uploader": falso_uploader}
                    ),
                ):
                    resultado = subir_foto_task(str(foto.id_foto), ruta.name)
        foto.refresh_from_db()
        self.assertEqual(foto.estado, Foto.ESTADO_COMPLETED)
        self.assertEqual(foto.url, "https://res.cloudinary.com/d/abc.jpg")
        self.assertFalse(ruta.exists())
        self.assertIn("abc", resultado)

    def test_tarea_marca_failed_sin_archivo(self) -> None:
        atractivo = _atractivo()
        foto = Foto.objects.create(atractivo=atractivo, public_id="turismo/pending/y")
        with tempfile.TemporaryDirectory() as tmp:
            with override_settings(STAGING_DIR=tmp):
                with self.assertRaises(FileNotFoundError):
                    subir_foto_task(str(foto.id_foto), "no-existe.jpg")
        foto.refresh_from_db()
        self.assertEqual(foto.estado, Foto.ESTADO_FAILED)

    def test_purgar_staging_elimina_viejos(self) -> None:
        import os
        import time

        with tempfile.TemporaryDirectory() as tmp:
            viejo = Path(tmp) / "viejo.jpg"
            viejo.write_bytes(b"x")
            viejo_ts = time.time() - 30 * 3600
            os.utime(viejo, (viejo_ts, viejo_ts))
            nuevo = Path(tmp) / "nuevo.jpg"
            nuevo.write_bytes(b"x")
            with override_settings(STAGING_DIR=tmp):
                purgados = purgar_staging(max_horas=24)
            self.assertEqual(purgados, 1)
            self.assertFalse(viejo.exists())
            self.assertTrue(nuevo.exists())
