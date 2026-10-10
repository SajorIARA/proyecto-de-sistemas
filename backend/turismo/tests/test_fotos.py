from __future__ import annotations

from unittest import mock

from django.contrib.gis.geos import Point
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from turismo.models import Atractivo, Foto
from usuarios.models import Rol, Usuario

FOTOS_URL = "/api/turismo/admin/fotos/"
FIRMA_URL = "/api/turismo/admin/fotos/firma/"


def _admin() -> tuple[APIClient, Usuario]:
    cliente = APIClient()
    usuario = Usuario.objects.create_user(
        email="admin_foto@test.com", password="Clave99!", nombre="Admin Foto"
    )
    rol, _ = Rol.objects.get_or_create(
        codigo="ADMIN", defaults={"nombre": "Administrador"}
    )
    usuario.roles.add(rol)
    resp = cliente.post(
        "/api/auth/login/",
        {"email": "admin_foto@test.com", "password": "Clave99!"},
        format="json",
    )
    cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return cliente, usuario


def _atractivo() -> Atractivo:
    return Atractivo.objects.create(
        nombre="Foto Test",
        descripcion="Atractivo",
        ubicacion=Point(-68.14, -16.49, srid=4326),
    )


class FotoAdminCRUDTests(TestCase):
    def setUp(self) -> None:
        self.cliente, _ = _admin()
        self.atractivo = _atractivo()

    def test_crear_y_listar_foto(self) -> None:
        resp = self.cliente.post(
            FOTOS_URL,
            {
                "atractivo": str(self.atractivo.id_atractivo),
                "public_id": "turismo/dev/foto-1",
                "url": "https://res.cloudinary.com/x/image/upload/foto-1",
                "orden": 0,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        resp = self.cliente.get(FOTOS_URL)
        self.assertEqual(resp.data["count"], 1)

    def test_turista_no_gestiona_fotos(self) -> None:
        turista = Usuario.objects.create_user(
            email="tur_foto@test.com", password="Clave99!", nombre="Tur"
        )
        rol, _ = Rol.objects.get_or_create(
            codigo="TOURIST", defaults={"nombre": "Turista"}
        )
        turista.roles.add(rol)
        c = APIClient()
        login = c.post(
            "/api/auth/login/",
            {"email": "tur_foto@test.com", "password": "Clave99!"},
            format="json",
        )
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        resp = c.post(
            FOTOS_URL,
            {
                "atractivo": str(self.atractivo.id_atractivo),
                "public_id": "turismo/dev/no",
                "url": "https://res.cloudinary.com/x/no",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_catalogo_incluye_imagenes(self) -> None:
        Foto.objects.create(
            atractivo=self.atractivo,
            public_id="turismo/dev/portada",
            url="https://res.cloudinary.com/x/portada",
            orden=0,
        )
        resp = APIClient().get("/api/turismo/atractivos/")
        self.assertEqual(resp.data["results"][0]["imagenes"], ["turismo/dev/portada"])

    def test_admin_serializa_fotos_del_destino(self) -> None:
        Foto.objects.create(
            atractivo=self.atractivo,
            public_id="turismo/dev/a",
            url="https://res.cloudinary.com/x/a",
            estado=Foto.ESTADO_COMPLETED,
            orden=1,
        )
        resp = self.cliente.get(
            f"/api/turismo/admin/atractivos/{self.atractivo.id_atractivo}/"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["fotos"]), 1)
        self.assertEqual(resp.data["fotos"][0]["public_id"], "turismo/dev/a")
        self.assertEqual(resp.data["fotos"][0]["estado"], Foto.ESTADO_COMPLETED)

    def test_filtrar_fotos_por_atractivo(self) -> None:
        otro = _atractivo()
        Foto.objects.create(atractivo=self.atractivo, public_id="turismo/dev/p")
        Foto.objects.create(atractivo=otro, public_id="turismo/dev/q")

        resp = self.cliente.get(
            FOTOS_URL, {"atractivo": str(self.atractivo.id_atractivo)}
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        public_ids = [item["public_id"] for item in resp.data["results"]]
        self.assertEqual(public_ids, ["turismo/dev/p"])

    def test_filtrar_fotos_uuid_invalido_no_rompe(self) -> None:
        Foto.objects.create(atractivo=self.atractivo, public_id="turismo/dev/p")

        resp = self.cliente.get(FOTOS_URL, {"atractivo": "no-es-un-uuid"})

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 0)


class FirmaFotoTests(TestCase):
    def setUp(self) -> None:
        self.cliente, _ = _admin()
        self.atractivo = _atractivo()

    def test_sin_credenciales_503(self) -> None:
        # Fuerza el caso sin configurar aunque el entorno tenga credenciales.
        with mock.patch.dict(
            "django.conf.settings.CLOUDINARY",
            {"cloud_name": "", "api_key": "", "api_secret": ""},
            clear=False,
        ):
            resp = self.cliente.post(
                FIRMA_URL,
                {
                    "atractivo": str(self.atractivo.id_atractivo),
                    "formato": "jpg",
                    "bytes": 1000,
                },
                format="json",
            )
        # Sin CLOUDINARY_* en env de tests -> degradado controlado.
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_anonimo_401(self) -> None:
        resp = APIClient().post(FIRMA_URL, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_firma_valida_con_credenciales(self) -> None:
        with (
            mock.patch.dict(
                "django.conf.settings.CLOUDINARY",
                {
                    "cloud_name": "demo",
                    "api_key": "key",
                    "api_secret": "secreto",
                },
                clear=False,
            ),
            mock.patch(
                "turismo.views.api_sign_request", return_value="firma123"
            ) as mock_firma,
        ):
            resp = self.cliente.post(
                FIRMA_URL,
                {
                    "atractivo": str(self.atractivo.id_atractivo),
                    "formato": "webp",
                    "bytes": 5000,
                },
                format="json",
            )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["signature"], "firma123")
        self.assertEqual(resp.data["cloud_name"], "demo")
        mock_firma.assert_called_once()

    def test_firma_rechaza_formato_y_peso(self) -> None:
        with mock.patch.dict(
            "django.conf.settings.CLOUDINARY",
            {"cloud_name": "d", "api_key": "k", "api_secret": "s"},
            clear=False,
        ):
            base = {
                "atractivo": str(self.atractivo.id_atractivo),
                "formato": "bmp",
                "bytes": 100,
            }
            self.assertEqual(
                self.cliente.post(FIRMA_URL, base, format="json").status_code,
                status.HTTP_400_BAD_REQUEST,
            )
            base.update({"formato": "jpg", "bytes": 99 * 1024 * 1024})
            self.assertEqual(
                self.cliente.post(FIRMA_URL, base, format="json").status_code,
                status.HTTP_400_BAD_REQUEST,
            )
