from __future__ import annotations

from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from recomendaciones.models import UsuarioPreferencia
from turismo.models import Categoria
from usuarios.models import Rol, Usuario

URL = "/api/preferences/"


def _usuario(email: str, rol: str) -> Usuario:
    u = Usuario.objects.create_user(
        email=email, password="Clave99!", nombre=email.split("@")[0]
    )
    r, _ = Rol.objects.get_or_create(codigo=rol, defaults={"nombre": rol})
    u.roles.add(r)
    return u


def _login(cliente: APIClient, email: str) -> str:
    resp = cliente.post(
        "/api/auth/login/",
        {"email": email, "password": "Clave99!"},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    return resp.data["access"]


class MisPreferenciasTests(TestCase):
    """DoD issue #22: /api/preferences/ con JWT, solo lo propio."""

    @classmethod
    def setUpTestData(cls) -> None:
        cls.turista = _usuario("pref_turista@test.com", "TOURIST")
        cls.otro = _usuario("pref_otro@test.com", "TOURIST")
        cls.categoria = Categoria.objects.create(nombre="MisPrefs")

    def _cliente(self, email: str) -> APIClient:
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {_login(c, email)}")
        return c

    def test_anonimo_get_401(self) -> None:
        self.assertEqual(APIClient().get(URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonimo_post_401(self) -> None:
        self.assertEqual(
            APIClient().post(URL, {}, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_get_solo_muestra_lo_propio(self) -> None:
        UsuarioPreferencia.objects.create(
            usuario=self.otro,
            categoria=self.categoria,
            nivel_interes=Decimal("0.50"),
        )
        resp = self._cliente(self.turista.email).get(URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 0)

    def test_post_asigna_usuario_del_jwt(self) -> None:
        c = self._cliente(self.turista.email)
        resp = c.post(
            URL,
            {
                "usuario": str(self.otro.id_usuario),
                "categoria": self.categoria.id_categoria,
                "nivel_interes": "0.90",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        pref = UsuarioPreferencia.objects.get(pk=resp.data["id"])
        self.assertEqual(pref.usuario, self.turista)

    def test_post_nivel_invalido_400(self) -> None:
        c = self._cliente(self.turista.email)
        resp = c.post(
            URL,
            {
                "categoria": self.categoria.id_categoria,
                "nivel_interes": "5",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_propio_ok_y_ajeno_404(self) -> None:
        c = self._cliente(self.turista.email)
        propia = UsuarioPreferencia.objects.create(
            usuario=self.turista,
            categoria=self.categoria,
            nivel_interes=Decimal("0.50"),
        )
        ajena = UsuarioPreferencia.objects.create(
            usuario=self.otro,
            categoria=self.categoria,
            nivel_interes=Decimal("0.50"),
        )
        resp = c.patch(f"{URL}{propia.pk}/", {"nivel_interes": "0.95"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = c.patch(f"{URL}{ajena.pk}/", {"nivel_interes": "0.95"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_propio_204(self) -> None:
        c = self._cliente(self.turista.email)
        propia = UsuarioPreferencia.objects.create(
            usuario=self.turista,
            categoria=self.categoria,
            nivel_interes=Decimal("0.50"),
        )
        resp = c.delete(f"{URL}{propia.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)


class BboxLaPazTests(TestCase):
    """DoD issue #22: coordenadas fuera de La Paz → 400."""

    @classmethod
    def setUpTestData(cls) -> None:
        cls.admin = _usuario("bbox_admin@test.com", "ADMIN")

    def _payload(self, lon: float, lat: float) -> dict:
        return {
            "usuario": str(self.admin.id_usuario),
            "presupuesto_bob": "100.00",
            "tiempo_horas": "4.00",
            "punto_partida": {"coordinates": [lon, lat]},
        }

    def test_punto_en_la_paz_ok(self) -> None:
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {_login(c, self.admin.email)}")
        resp = c.post(
            "/api/recomendaciones/consultas/",
            self._payload(-68.1486, -16.4966),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_punto_fuera_de_la_paz_400(self) -> None:
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {_login(c, self.admin.email)}")
        # Madrid y punto 0,0: válidos globalmente, fuera del bbox paceño.
        for lon, lat in [(-3.7038, 40.4168), (0.0, 0.0), (-70.0, -16.5)]:
            resp = c.post(
                "/api/recomendaciones/consultas/",
                self._payload(lon, lat),
                format="json",
            )
            self.assertEqual(
                resp.status_code, status.HTTP_400_BAD_REQUEST, f"{lon},{lat}"
            )
