from __future__ import annotations

import base64
import json
import os
import socketserver
import tempfile
import threading
from unittest import mock

from django.test import SimpleTestCase, override_settings

from conocimiento.fuentes_abiertas import (
    FuenteAbiertaError,
    _consulta_overpass,
    _opener_para_fuentes,
    buscar_en_overpass,
    buscar_lugares,
    validar_ciudad,
    validar_termino,
)


class _DescargadorFalso(socketserver.StreamRequestHandler):
    def handle(self) -> None:
        self.rfile.readline()
        cuerpo = json.dumps(
            {
                "elements": [
                    {
                        "type": "node",
                        "id": 9,
                        "lat": -16.5,
                        "lon": -68.14,
                        "tags": {"name": "Bar Falso", "amenity": "bar"},
                    }
                ]
            }
        ).encode("utf-8")
        self.wfile.write(
            json.dumps(
                {"estado": 200, "cuerpo": base64.b64encode(cuerpo).decode("ascii")}
            ).encode("utf-8")
            + b"\n"
        )


@override_settings(FUENTES_ABIERTAS_MIN_INTERVAL_SECONDS=0)
class FuentesAbiertasTests(SimpleTestCase):
    def test_normaliza_overpass_sin_inventar_datos(self) -> None:
        respuesta = {
            "elements": [
                {
                    "type": "node",
                    "id": 123,
                    "lat": -16.4962,
                    "lon": -68.1391,
                    "tags": {
                        "name": "Mercado de las Brujas",
                        "tourism": "marketplace",
                        "addr:street": "Calle Linares",
                        "opening_hours": "Mo-Sa 10:00-18:00",
                        "website": "https://ejemplo.invalid/",
                    },
                },
                {"type": "way", "id": 99, "center": {"lat": -16.5, "lon": -68.14}},
            ]
        }
        with mock.patch(
            "conocimiento.fuentes_abiertas._descargar_json", return_value=respuesta
        ) as descarga:
            candidatos = buscar_en_overpass("mercado", ciudad="La Paz", limite=5)

        self.assertEqual(len(candidatos), 1)
        candidato = candidatos[0]
        self.assertEqual(candidato.id_externo, "node/123")
        self.assertEqual(candidato.nombre, "Mercado de las Brujas")
        self.assertEqual(candidato.categoria_sugerida, "Compras")
        self.assertEqual(candidato.descripcion, "")
        self.assertEqual(candidato.direccion, "Calle Linares")
        self.assertEqual(candidato.horario_declarado, "Mo-Sa 10:00-18:00")
        self.assertEqual(
            candidato.url_fuente, "https://www.openstreetmap.org/node/123"
        )
        consulta_enviada = descarga.call_args.kwargs["datos"]["data"]
        self.assertIn("[out:json]", consulta_enviada)
        self.assertIn("-16.63,-68.22,-16.45,-68.0", consulta_enviada)
        self.assertEqual(len(candidato.hash_contenido), 64)

    def test_un_fallo_no_descarta_las_demas_fuentes(self) -> None:
        candidato = mock.Mock(fuente="wikidata", id_externo="Q1")
        with (
            mock.patch(
                "conocimiento.fuentes_abiertas.buscar_en_overpass",
                side_effect=FuenteAbiertaError("overpass", "sin conexión"),
            ),
            mock.patch(
                "conocimiento.fuentes_abiertas.buscar_en_wikidata",
                return_value=[candidato],
            ),
        ):
            resultados, errores = buscar_lugares(
                "museo", ciudad="La Paz", fuentes=("overpass", "wikidata")
            )

        self.assertEqual(resultados, [candidato])
        self.assertEqual(errores, {"overpass": "sin conexión"})

    @override_settings(
        FUENTES_ABIERTAS_OVERPASS_URL="https://primera.invalid/api",
        FUENTES_ABIERTAS_OVERPASS_URLS=[
            "https://primera.invalid/api",
            "https://segunda.invalid/api",
        ],
        FUENTES_ABIERTAS_REINTENTOS_OVERPASS=0,
    )
    def test_prueba_espejos_y_busca_bares_por_etiqueta(self) -> None:
        respuesta = {
            "elements": [
                {
                    "type": "node",
                    "id": 321,
                    "lat": -16.5,
                    "lon": -68.14,
                    "tags": {"name": "Bar Equinoccio", "amenity": "bar"},
                }
            ]
        }
        with mock.patch(
            "conocimiento.fuentes_abiertas._descargar_json",
            side_effect=[ConnectionError("503"), respuesta],
        ) as descarga:
            candidatos = buscar_en_overpass("bares de La Paz", ciudad="La Paz")

        self.assertEqual([c.id_externo for c in candidatos], ["node/321"])
        self.assertEqual(descarga.call_count, 2)
        self.assertEqual(descarga.call_args.args[0], "https://segunda.invalid/api")
        consulta = descarga.call_args.kwargs["datos"]["data"]
        self.assertIn('["amenity"="bar"]', consulta)
        self.assertIn("bares", consulta)
        self.assertIn("bar", consulta)
        self.assertNotIn(r"\s+", consulta)

    def test_el_nombre_no_confunde_barrio_con_bar(self) -> None:
        consulta = _consulta_overpass(
            "bares de La Paz", "La Paz", (-16.63, -68.22, -16.45, -68.0), 5
        )
        self.assertIn(
            '["name"~"(^|[^[:alnum:]])(bares|bars|bar)([^[:alnum:]]|$)",i]',
            consulta,
        )

    @override_settings(FUENTES_ABIERTAS_OVERPASS_URLS=[])
    def test_miradores_usan_etiqueta_viewpoint(self) -> None:
        with mock.patch(
            "conocimiento.fuentes_abiertas._descargar_json", return_value={"elements": []}
        ) as descarga:
            buscar_en_overpass("miradores de La Paz", ciudad="La Paz")

        consulta = descarga.call_args.kwargs["datos"]["data"]
        self.assertIn('["tourism"="viewpoint"]', consulta)
        self.assertNotIn("miradores\\s+de\\s+La\\s+Paz", consulta)

    def test_descarga_por_socket_unix_compartido(self) -> None:
        with tempfile.TemporaryDirectory() as temporal:
            ruta = os.path.join(temporal, "descargador.sock")
            servidor = socketserver.ThreadingUnixStreamServer(ruta, _DescargadorFalso)
            hilo = threading.Thread(target=servidor.serve_forever, daemon=True)
            hilo.start()
            try:
                with override_settings(
                    FUENTES_ABIERTAS_PROXY_URL=f"unix://{ruta}",
                    FUENTES_ABIERTAS_OVERPASS_URL="https://overpass.invalid/api",
                    FUENTES_ABIERTAS_OVERPASS_URLS=[],
                ):
                    candidatos = buscar_en_overpass("bares de La Paz")
            finally:
                servidor.shutdown()
                servidor.server_close()
                hilo.join(timeout=2)

        self.assertEqual([c.id_externo for c in candidatos], ["node/9"])
        self.assertEqual(candidatos[0].nombre, "Bar Falso")

    def test_opener_solo_usa_proxy_configurado(self) -> None:
        objetivo = "conocimiento.fuentes_abiertas.build_opener"
        with (
            override_settings(FUENTES_ABIERTAS_PROXY_URL=""),
            mock.patch.dict(os.environ, {"HTTPS_PROXY": "http://del-entorno.invalid"}),
            mock.patch(objetivo) as construir,
        ):
            _opener_para_fuentes()
        self.assertEqual(construir.call_args.args[0].proxies, {})

        with (
            override_settings(FUENTES_ABIERTAS_PROXY_URL="http://proxy.invalid:8899"),
            mock.patch(objetivo) as construir,
        ):
            _opener_para_fuentes()
        self.assertEqual(
            construir.call_args.args[0].proxies,
            {
                "http": "http://proxy.invalid:8899",
                "https": "http://proxy.invalid:8899",
            },
        )

    def test_valida_entrada_sin_inyeccion_de_consulta(self) -> None:
        validar_termino("Museo de la Calle Jaén")
        validar_ciudad("La Paz")
        with self.assertRaises(ValueError):
            validar_termino("x\";nwr")
        with self.assertRaises(ValueError):
            validar_ciudad("Quito")
