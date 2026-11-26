"""Carga manual e idempotente de imágenes Wikimedia con atribución persistida."""

from __future__ import annotations

import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from turismo.models import Atractivo, Foto


@dataclass(frozen=True)
class ImagenWikimedia:
    atractivo: str
    url: str
    pagina_origen: str
    licencia: str
    atribucion: str


IMAGENES = (
    ImagenWikimedia(
        atractivo="Basílica Menor de San Francisco",
        url=(
            "https://upload.wikimedia.org/wikipedia/commons/3/37/"
            "Bas%C3%ADlica_Menor_Nuestra_Se%C3%B1ora_de_los_%C3%81ngeles_"
            "%28San_Francisco%29.jpg"
        ),
        pagina_origen=(
            "https://commons.wikimedia.org/wiki/File:Bas%C3%ADlica_Menor_"
            "Nuestra_Se%C3%B1ora_de_los_%C3%81ngeles_(San_Francisco).jpg"
        ),
        licencia="CC BY-SA 4.0",
        atribucion="Parallelepiped09, Wikimedia Commons, CC BY-SA 4.0.",
    ),
)


def _descargar(url: str) -> Path:
    temporal = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    try:
        peticion = Request(url, headers={"User-Agent": "TurismoMelgarejoBot/1.0"})
        with urlopen(peticion, timeout=30) as respuesta:
            if respuesta.headers.get_content_type() not in {"image/jpeg", "image/png"}:
                raise CommandError("Wikimedia no devolvió una imagen permitida.")
            shutil.copyfileobj(respuesta, temporal, length=1024 * 1024)
    except Exception:
        Path(temporal.name).unlink(missing_ok=True)
        raise
    finally:
        temporal.close()
    return Path(temporal.name)


class Command(BaseCommand):
    help = "Sube imágenes CC reutilizables a Cloudinary y conserva atribución."

    def add_arguments(self, parser):
        parser.add_argument(
            "--archivo-local",
            help=(
                "Archivo ya descargado dentro del contenedor. Útil si la red interna "
                "no tiene salida a Wikimedia."
            ),
        )

    def handle(self, *args, **options):
        configuracion = settings.CLOUDINARY
        if not all(
            configuracion.get(clave)
            for clave in ("cloud_name", "api_key", "api_secret")
        ):
            raise CommandError("Cloudinary no está configurado.")
        try:
            import cloudinary
            from cloudinary.uploader import upload
        except ImportError as exc:
            raise CommandError("SDK de Cloudinary no está instalado.") from exc
        cloudinary.config(**configuracion, secure=True)

        subidas = 0
        for imagen in IMAGENES:
            atractivo = Atractivo.objects.filter(nombre=imagen.atractivo).first()
            if atractivo is None:
                raise CommandError(f"Atractivo ausente: {imagen.atractivo}")
            if Foto.objects.filter(url_origen=imagen.pagina_origen).exists():
                self.stdout.write(f"Sin cambios: {imagen.atractivo}")
                continue
            archivo_local = options["archivo_local"]
            if archivo_local and len(IMAGENES) != 1:
                raise CommandError(
                    "--archivo-local solo es válido cuando hay una única imagen configurada."
                )
            descargado = not bool(archivo_local)
            archivo = Path(archivo_local) if archivo_local else _descargar(imagen.url)
            if not archivo.is_file():
                raise CommandError(f"No existe el archivo local: {archivo}")
            try:
                resultado = upload(
                    str(archivo),
                    folder=f"atractivos/{atractivo.id_atractivo}-{atractivo.slug}",
                    public_id=f"wikimedia-{slugify(imagen.atractivo)}",
                    unique_filename=False,
                    overwrite=False,
                    resource_type="image",
                )
            finally:
                if descargado:
                    archivo.unlink(missing_ok=True)
            Foto.objects.create(
                atractivo=atractivo,
                public_id=resultado["public_id"],
                url=resultado["secure_url"],
                ancho=resultado.get("width"),
                alto=resultado.get("height"),
                orden=atractivo.fotos.count(),
                tipo=Foto.TIPO_IMAGEN,
                estado=Foto.ESTADO_COMPLETED,
                url_origen=imagen.pagina_origen,
                licencia=imagen.licencia,
                atribucion=imagen.atribucion,
            )
            subidas += 1
        self.stdout.write(self.style.SUCCESS(f"Imágenes subidas: {subidas}."))
