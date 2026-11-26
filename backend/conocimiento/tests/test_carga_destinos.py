from unittest.mock import patch

from django.test import TestCase

from conocimiento.carga_destinos import cargar_destinos
from conocimiento.destinos_listado import DESTINOS_SOLICITADOS
from conocimiento.fichas_oficiales import (
    extraer_secciones,
    texto_para_rag,
    valor_seccion,
)
from conocimiento.imagenes_destinos import obtener_imagen
from conocimiento.models import FragmentoDocumental, FuenteDocumental
from turismo.models import Atractivo, Foto

FICHA = """
<html><body><main>
<h1>Destino de prueba</h1>
<p>Descripcion de prueba con suficiente longitud para que el extractor la considere util.</p>
<h2>DESCRIPCIÓN</h2>
<p>Texto descriptivo publicado por la ficha municipal para probar el analisis.</p>
<h2>HORARIO</h2>
<p>LUNES A VIERNES 09:00 - 17:00</p>
<h2>COSTO</h2>
<p>INGRESO GRATUITO</p>
</main></body></html>
""".encode("utf-8")


class FichasOficialesTests(TestCase):
    def test_extrae_secciones_declaradas(self):
        secciones = extraer_secciones(FICHA, url="https://lapaz.bo/turismo/prueba/")
        self.assertIn("descripcion", secciones)
        self.assertEqual(
            valor_seccion(secciones, "horario"), "LUNES A VIERNES 09:00 - 17:00"
        )
        self.assertEqual(valor_seccion(secciones, "costo"), "INGRESO GRATUITO")
        self.assertEqual(valor_seccion(secciones, "direccion"), "No verificado")

    def test_texto_para_rag_marca_lo_no_verificado(self):
        texto = texto_para_rag(
            "Prueba",
            categoria="Cultura",
            descripcion="",
            horario="",
            costo="",
            direccion="",
            url_fuente="",
            url_coordenadas="",
            latitud=None,
            longitud=None,
            imagen_atribucion="",
        )
        self.assertEqual(texto.count("No verificado"), 8)


class ImagenesDestinosTests(TestCase):
    @patch("conocimiento.imagenes_destinos.solicitar")
    def test_obtener_imagen_valida_licencia_y_autor(self, solicitar):
        solicitar.return_value = b"""{"query":{"pages":{"1":{
            "title":"File:Prueba.jpg",
            "imageinfo":[{
                "thumburl":"https://upload.wikimedia.org/thumb/Prueba.jpg",
                "descriptionurl":"https://commons.wikimedia.org/wiki/File:Prueba.jpg",
                "extmetadata":{
                    "LicenseShortName":{"value":"CC BY-SA 4.0"},
                    "Artist":{"value":"<a>Autora Prueba</a>"}
                }
            }]
        }}}}"""
        imagen = obtener_imagen("Prueba.jpg")
        self.assertIsNotNone(imagen)
        self.assertEqual(
            imagen.atribucion, "Autora Prueba, Wikimedia Commons, CC BY-SA 4.0."
        )


class CargaDestinosSolicitadosTests(TestCase):
    def test_cada_destino_declara_un_archivo_commons_distinto(self):
        archivos = [destino.archivo_commons for destino in DESTINOS_SOLICITADOS]
        self.assertEqual(len(archivos), len(set(archivos)))

    def test_publica_los_30_destinos_y_es_idempotente(self):
        self.assertEqual(len(DESTINOS_SOLICITADOS), 30)
        with (
            patch("conocimiento.carga_destinos.solicitar", return_value=FICHA),
            patch(
                "conocimiento.carga_destinos.enriquecer_con_imagen",
                return_value="Autora, Wikimedia Commons, CC BY-SA 4.0.",
            ),
        ):
            primera = cargar_destinos(con_imagenes=True)
            self.assertEqual(primera.errores, ())
            self.assertEqual(primera.atractivos_creados, 30)
            self.assertEqual(
                FuenteDocumental.objects.filter(tipo="ficha_oficial").count(), 30
            )
            self.assertGreaterEqual(FragmentoDocumental.objects.count(), 30)

            segunda = cargar_destinos(con_imagenes=True)
            self.assertEqual(segunda.atractivos_creados, 0)
            self.assertEqual(segunda.fuentes_actualizadas, 30)
            self.assertEqual(FragmentoDocumental.objects.count(), primera.fragmentos)
            self.assertEqual(Atractivo.objects.filter(activo=True).count(), 30)
            self.assertEqual(Foto.objects.count(), 0)
