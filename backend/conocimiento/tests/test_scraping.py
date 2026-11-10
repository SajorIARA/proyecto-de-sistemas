from __future__ import annotations

from email.message import Message
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase, override_settings

from conocimiento.models import FragmentoDocumental, FuenteDocumental
from conocimiento.scraping import (
    DocumentoWeb,
    URLNoPermitida,
    extraer_documento,
    validar_url,
)
from conocimiento.services import fragmentar_texto, ingerir_url


class SeguridadScraperTests(SimpleTestCase):
    @patch("conocimiento.scraping._resolver_ips", return_value={"8.8.8.8"})
    def test_acepta_dominio_permitido_y_elimina_fragmento(self, _resolver) -> None:
        url = validar_url(
            "https://turismo.example.org/ruta?q=1#seccion", ["example.org"]
        )
        self.assertEqual(url, "https://turismo.example.org/ruta?q=1")

    @patch("conocimiento.scraping._resolver_ips", return_value={"127.0.0.1"})
    def test_bloquea_ip_privada_o_local(self, _resolver) -> None:
        with self.assertRaises(URLNoPermitida):
            validar_url("https://turismo.example.org/", ["example.org"])

    def test_bloquea_dominio_fuera_de_allowlist_sin_resolverlo(self) -> None:
        with patch("conocimiento.scraping._resolver_ips") as resolver:
            with self.assertRaises(URLNoPermitida):
                validar_url("https://evil.example/", ["example.org"])
            resolver.assert_not_called()

    @patch("conocimiento.scraping._resolver_ips", return_value={"8.8.8.8"})
    def test_bloquea_puerto_no_estandar(self, _resolver) -> None:
        with self.assertRaises(URLNoPermitida):
            validar_url("https://example.org:8443/", ["example.org"])


class ExtraccionYChunkingTests(SimpleTestCase):
    def test_extrae_main_y_descarta_navegacion_scripts(self) -> None:
        html = b"""
        <html><head><title>Valle de la Luna</title><script>secreto()</script></head>
        <body><nav>Menu repetitivo</nav><main>
        <h1>Valle de la Luna</h1>
        <p>El Valle de la Luna es un atractivo natural ubicado en La Paz,
        Bolivia. Sus formaciones fueron creadas por la erosion y ofrece
        senderos para visitantes durante gran parte del dia.</p>
        </main><footer>Pie repetitivo</footer></body></html>
        """
        headers = Message()
        headers["Content-Type"] = "text/html; charset=utf-8"
        documento = extraer_documento("https://example.org/valle", html, headers)
        self.assertEqual(documento.titulo, "Valle de la Luna")
        self.assertIn("formaciones", documento.texto)
        self.assertNotIn("Menu repetitivo", documento.texto)
        self.assertNotIn("secreto", documento.texto)

    def test_fragmenta_con_limite_y_solapamiento(self) -> None:
        texto = " ".join(f"palabra{i}" for i in range(150))
        fragmentos = fragmentar_texto(texto, tamano=250, solapamiento=40)
        self.assertGreater(len(fragmentos), 1)
        self.assertTrue(all(len(fragmento) <= 250 for fragmento in fragmentos))
        self.assertTrue(set(fragmentos[0].split()) & set(fragmentos[1].split()))


@override_settings(
    SCRAPER_ALLOWED_DOMAINS=("example.org",),
    SCRAPER_CHUNK_CHARS=250,
    SCRAPER_CHUNK_OVERLAP_CHARS=40,
)
class IngestaScraperTests(TestCase):
    def setUp(self) -> None:
        self.url = "https://example.org/destino"
        self.documento = DocumentoWeb(
            url=self.url,
            titulo="Destino oficial",
            texto=" ".join(f"contenido{i}" for i in range(120)),
        )

    @patch("conocimiento.services.validar_url")
    @patch("conocimiento.services.scrapear_url")
    def test_crea_fuente_y_fragmentos_sin_embedding(self, scrapear, validar) -> None:
        validar.return_value = self.url
        scrapear.return_value = self.documento
        resultado = ingerir_url(self.url)
        fuente = FuenteDocumental.objects.get(pk=resultado.id_fuente)
        self.assertEqual(fuente.estado_scraping, FuenteDocumental.ESTADO_COMPLETADO)
        self.assertGreater(resultado.fragmentos, 1)
        self.assertFalse(fuente.fragmentos.filter(embedding__isnull=False).exists())

    @patch("conocimiento.services.validar_url")
    @patch("conocimiento.services.scrapear_url")
    def test_segunda_ingesta_identica_es_idempotente(self, scrapear, validar) -> None:
        validar.return_value = self.url
        scrapear.return_value = self.documento
        primero = ingerir_url(self.url)
        ids = list(FragmentoDocumental.objects.values_list("pk", flat=True))
        segundo = ingerir_url(self.url)
        self.assertTrue(primero.actualizado)
        self.assertFalse(segundo.actualizado)
        self.assertEqual(
            ids, list(FragmentoDocumental.objects.values_list("pk", flat=True))
        )

    @patch("conocimiento.services.validar_url")
    @patch(
        "conocimiento.services.scrapear_url",
        side_effect=RuntimeError("fallo remoto"),
    )
    def test_registra_error_de_scraping(self, _scrapear, validar) -> None:
        validar.return_value = self.url
        with self.assertRaises(RuntimeError):
            ingerir_url(self.url)
        fuente = FuenteDocumental.objects.get(url=self.url)
        self.assertEqual(fuente.estado_scraping, FuenteDocumental.ESTADO_ERROR)
        self.assertIn("fallo remoto", fuente.error_scraping)
