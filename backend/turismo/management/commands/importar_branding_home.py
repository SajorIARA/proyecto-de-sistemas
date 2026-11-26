"""Importa a Cloudinary la colección fotográfica de la portada.

Las imágenes provienen de Wikimedia Commons y conservan autoría, licencia y
URL de origen en el contexto del recurso. El comando es idempotente: no vuelve
a subir un ``public_id`` que ya existe.
"""

from __future__ import annotations

import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


@dataclass(frozen=True)
class RecursoHome:
    public_id: str
    url: str
    pagina_origen: str
    licencia: str
    autor: str
    uso: str


RECURSOS = (
    RecursoHome(
        public_id="branding/home/hero-teleferico-rojo",
        url=(
            "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/"
            "L%C3%ADnea_Roja_de_Mi_Telef%C3%A9rico_en_La_Paz%2C_Bolivia.jpg/"
            "1920px-L%C3%ADnea_Roja_de_Mi_Telef%C3%A9rico_en_La_Paz%2C_Bolivia.jpg"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/"
            "File:L%C3%ADnea_Roja_de_Mi_Telef%C3%A9rico_en_La_Paz,_Bolivia.jpg"
        ),
        licencia="CC BY-SA 4.0",
        autor="EEJCC",
        uso="Hero principal y Teleférico",
    ),
    RecursoHome(
        public_id="branding/home/panorama-la-paz",
        url=(
            "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/"
            "Vista_de_la_Ciudad_de_La_Paz_Bolivia.jpg/"
            "1920px-Vista_de_la_Ciudad_de_La_Paz_Bolivia.jpg"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/"
            "File:Vista_de_la_Ciudad_de_La_Paz_Bolivia.jpg"
        ),
        licencia="CC BY-SA 4.0",
        autor="Jgbmac",
        uso="Panorama de La Paz",
    ),
    RecursoHome(
        public_id="branding/home/valle-de-la-luna",
        url=(
            "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/"
            "Valle_de_la_Luna_Bolivia_53.jpg/"
            "1920px-Valle_de_la_Luna_Bolivia_53.jpg"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/File:Valle_de_la_Luna_Bolivia_53.jpg"
        ),
        licencia="CC BY 4.0",
        autor="Arabsalam",
        uso="Destino destacado",
    ),
    RecursoHome(
        public_id="branding/home/tiwanaku-puerta-del-sol",
        url=(
            "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/"
            "Puerta_del_Sol_en_Tiwanaku_%28Bolivia%29.jpg/"
            "1920px-Puerta_del_Sol_en_Tiwanaku_%28Bolivia%29.jpg"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/"
            "File:Puerta_del_Sol_en_Tiwanaku_(Bolivia).jpg"
        ),
        licencia="CC BY 2.0",
        autor="jmage",
        uso="Destino Tiwanaku",
    ),
    RecursoHome(
        public_id="branding/home/copacabana-titicaca",
        url=(
            "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/"
            "Copacabana_lago_titicaca_Bolivia_%2842413%29.jpg/"
            "1920px-Copacabana_lago_titicaca_Bolivia_%2842413%29.jpg"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/"
            "File:Copacabana_lago_titicaca_Bolivia_(42413).jpg"
        ),
        licencia="CC0",
        autor="Qhanaaru",
        uso="Destino Copacabana",
    ),
    RecursoHome(
        public_id="branding/home/cascada-coroico",
        url=(
            "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/"
            "Cascada_de_Coroico.JPG/1920px-Cascada_de_Coroico.JPG"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/File:Cascada_de_Coroico.JPG"
        ),
        licencia="CC BY-SA 3.0",
        autor="Dr. Vladimir Iván",
        uso="Destino Coroico y naturaleza",
    ),
    RecursoHome(
        public_id="branding/home/cultura-cholitas",
        url=(
            "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/"
            "Cholitas_bolivianas_en_la_fiesta_del_El_Preste_La_Paz_Bolivia.jpg/"
            "1920px-Cholitas_bolivianas_en_la_fiesta_del_El_Preste_La_Paz_Bolivia.jpg"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/"
            "File:Cholitas_bolivianas_en_la_fiesta_del_El_Preste_La_Paz_Bolivia.jpg"
        ),
        licencia="CC BY-SA 4.0",
        autor="Jmillan325",
        uso="Cultura y tradiciones",
    ),
    RecursoHome(
        public_id="branding/home/gastronomia-saltenas",
        url=(
            "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/"
            "Salte%C3%B1as_%28Plaza_Mayor%29-2011-01.JPG/"
            "1920px-Salte%C3%B1as_%28Plaza_Mayor%29-2011-01.JPG"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/"
            "File:Salte%C3%B1as_(Plaza_Mayor)-2011-01.JPG"
        ),
        licencia="CC BY 3.0",
        autor="Tamorlan",
        uso="Gastronomía",
    ),
    RecursoHome(
        public_id="branding/home/llama-altiplano",
        url=(
            "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/"
            "Llama_Altiplano_Boliviano.jpg/1920px-Llama_Altiplano_Boliviano.jpg"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/File:Llama_Altiplano_Boliviano.jpg"
        ),
        licencia="CC BY-SA 4.0",
        autor="Yulacha",
        uso="Fauna andina y galería",
    ),
    RecursoHome(
        public_id="branding/home/teleferico-vertical",
        url=(
            "https://upload.wikimedia.org/wikipedia/commons/a/ad/"
            "Mi_Telef%C3%A9rico%2C_La_Paz%2C_Bolivia.jpg"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/"
            "File:Mi_Telef%C3%A9rico,_La_Paz,_Bolivia.jpg"
        ),
        licencia="CC BY-SA 4.0",
        autor="Parallelepiped09",
        uso="Galería del Teleférico",
    ),
)


def _descargar(recurso: RecursoHome) -> Path:
    temporal = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    ruta = Path(temporal.name)
    try:
        peticion = Request(
            recurso.url,
            headers={"User-Agent": "TurismoLaPazBrandingBot/1.0"},
        )
        with urlopen(peticion, timeout=60) as respuesta:
            tipo = respuesta.headers.get_content_type()
            if tipo not in {"image/jpeg", "image/png"}:
                raise CommandError(
                    f"{recurso.public_id}: Wikimedia devolvió {tipo}, no una imagen."
                )
            shutil.copyfileobj(respuesta, temporal, length=1024 * 1024)
        if ruta.stat().st_size > 25 * 1024 * 1024:
            raise CommandError(f"{recurso.public_id}: la imagen supera 25 MiB.")
    except Exception:
        ruta.unlink(missing_ok=True)
        raise
    finally:
        temporal.close()
    return ruta


class Command(BaseCommand):
    help = "Descarga la colección visual de la portada y la sube a Cloudinary."

    def handle(self, *args, **options):
        configuracion = settings.CLOUDINARY
        requeridas = ("cloud_name", "api_key", "api_secret")
        if not all(configuracion.get(clave) for clave in requeridas):
            raise CommandError("Cloudinary no está configurado.")

        try:
            import cloudinary
            from cloudinary.exceptions import BadRequest
            from cloudinary.uploader import upload
        except ImportError as exc:
            raise CommandError("SDK de Cloudinary no está instalado.") from exc

        cloudinary.config(**configuracion, secure=True)
        subidos = 0
        omitidos = 0

        for recurso in RECURSOS:
            archivo = _descargar(recurso)
            try:
                resultado = upload(
                    str(archivo),
                    public_id=recurso.public_id,
                    unique_filename=False,
                    overwrite=False,
                    resource_type="image",
                    tags=["branding", "home", "turismo-la-paz", "wikimedia"],
                    context={
                        "autor": recurso.autor,
                        "licencia": recurso.licencia,
                        "fuente": recurso.pagina_origen,
                        "uso": recurso.uso,
                    },
                    timeout=60,
                )
            except BadRequest as exc:
                if "already exists" not in str(exc).lower():
                    raise
                self.stdout.write(f"Sin cambios: {recurso.public_id}")
                omitidos += 1
                continue
            finally:
                archivo.unlink(missing_ok=True)

            self.stdout.write(
                self.style.SUCCESS(
                    f"Subida: {resultado['public_id']} "
                    f"({resultado.get('width')}×{resultado.get('height')})"
                )
            )
            subidos += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Colección lista: {subidos} subidas, {omitidos} existentes."
            )
        )
