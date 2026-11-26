"""Fotos reutilizables: Wikimedia Commons -> Cloudinary, con atribución.

La búsqueda y la descarga salen por el proxy allowlistado. La subida también:
el SDK de Cloudinary firma los parámetros, pero el multipart viaja por el
mismo socket para no depender de salida directa desde el contenedor.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass

from django.conf import settings
from django.utils.text import slugify

from turismo.models import Atractivo, Foto

from .salida_proxy import solicitar

COMUNS_API = "https://commons.wikimedia.org/w/api.php"
LICENCIAS_ACEPTADAS = ("cc by", "cc0", "public domain", "dominio público")


@dataclass(frozen=True)
class ImagenDestino:
    url: str
    pagina_origen: str
    licencia: str
    atribucion: str
    nombre_archivo: str


def _limpiar_html(valor: str) -> str:
    texto = re.sub(r"<[^>]+>", " ", valor)
    texto = re.sub(r"&nbsp;", " ", texto)
    texto = re.sub(r"&amp;", "&", texto)
    return re.sub(r"\s+", " ", texto).strip()[:300]


def _imagen_desde_pagina(pagina: dict) -> ImagenDestino | None:
    info = (pagina.get("imageinfo") or [{}])[0]
    metadata = info.get("extmetadata") or {}
    licencia = _limpiar_html(metadata.get("LicenseShortName", {}).get("value", ""))
    autor = _limpiar_html(metadata.get("Artist", {}).get("value", ""))
    url = info.get("thumburl") or info.get("url")
    origen = info.get("descriptionurl")
    if not (url and origen and autor and licencia):
        return None
    if not any(tag in licencia.lower() for tag in LICENCIAS_ACEPTADAS):
        return None
    return ImagenDestino(
        url=url,
        pagina_origen=origen,
        licencia=licencia[:100],
        atribucion=f"{autor}, Wikimedia Commons, {licencia}.",
        nombre_archivo=pagina.get("title", "")[:200],
    )


def _consultar_api(parametros: dict) -> dict:
    crudo = solicitar(
        COMUNS_API,
        params={"action": "query", "format": "json", **parametros},
        cabeceras={"Accept": "application/json"},
    )
    return json.loads(crudo.decode("utf-8"))


def obtener_imagen(titulo: str) -> ImagenDestino | None:
    """Obtiene un archivo concreto de Commons (más fiable que buscar)."""

    if not titulo.startswith("File:"):
        titulo = f"File:{titulo}"
    try:
        datos = _consultar_api(
            {
                "titles": titulo,
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|size",
                "iiurlwidth": 1000,
            }
        )
    except (ValueError, UnicodeDecodeError, OSError):
        return None
    for pagina in (datos.get("query") or {}).get("pages", {}).values():
        imagen = _imagen_desde_pagina(pagina)
        if imagen:
            return imagen
    return None


def buscar_imagen(terminos: str) -> ImagenDestino | None:
    """Busca una foto con licencia reutilizable y autora declarada."""

    try:
        datos = _consultar_api(
            {
                "generator": "search",
                "gsrsearch": f"filetype:bitmap {terminos}",
                "gsrnamespace": 6,
                "gsrlimit": 8,
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|size",
                "iiurlwidth": 1000,
            }
        )
    except (ValueError, UnicodeDecodeError, OSError):
        return None
    for pagina in (datos.get("query") or {}).get("pages", {}).values():
        imagen = _imagen_desde_pagina(pagina)
        if imagen:
            return imagen
    return None


def descargar_imagen(imagen: ImagenDestino) -> bytes | None:
    try:
        return solicitar(imagen.url, cabeceras={"Accept": "image/jpeg,image/png"})
    except OSError:
        return None


def subir_imagen(
    atractivo: Atractivo, imagen: ImagenDestino, archivo: bytes
) -> Foto | None:
    """Sube la foto a Cloudinary por el proxy y guarda su atribución."""

    configuracion = settings.CLOUDINARY
    if not all(
        configuracion.get(clave) for clave in ("cloud_name", "api_key", "api_secret")
    ):
        return None
    # Un mismo archivo puede ilustrar varios destinos: cada atractivo guarda su
    # propia referencia (public_id distinto) y la repetición no crea duplicados.
    if Foto.objects.filter(
        atractivo=atractivo, url_origen=imagen.pagina_origen
    ).exists():
        return None

    try:
        import cloudinary
        from cloudinary import utils as cloudinary_utils

        cloudinary.config(**configuracion, secure=True)
        huella_origen = hashlib.sha256(
            imagen.pagina_origen.encode("utf-8")
        ).hexdigest()[:12]
        parametros = cloudinary_utils.build_upload_params(
            public_id=f"destino-{slugify(atractivo.nombre)}-{huella_origen}",
            folder=f"atractivos/{atractivo.id_atractivo}-{atractivo.slug}",
            overwrite=False,
            unique_filename=False,
            resource_type="image",
        )
        parametros = cloudinary_utils.sign_request(
            parametros,
            {
                "api_key": configuracion["api_key"],
                "api_secret": configuracion["api_secret"],
            },
        )
        limite = "----TurismoEnriquecimiento"
        partes: list[bytes] = []
        for clave, valor in parametros.items():
            if valor is None:
                continue
            partes.append(
                (
                    f"--{limite}\r\n"
                    f'Content-Disposition: form-data; name="{clave}"\r\n\r\n'
                    f"{valor}\r\n"
                ).encode("utf-8")
            )
        partes.append(
            (
                f"--{limite}\r\n"
                'Content-Disposition: form-data; name="file"; '
                'filename="imagen.jpg"\r\n'
                "Content-Type: image/jpeg\r\n\r\n"
            ).encode("ascii")
            + archivo
            + b"\r\n"
        )
        partes.append(f"--{limite}--\r\n".encode("ascii"))
        url = (
            f"https://api.cloudinary.com/v1_1/"
            f"{configuracion['cloud_name']}/image/upload"
        )
        respuesta = json.loads(
            solicitar(
                url,
                cuerpo=b"".join(partes),
                cabeceras={"Content-Type": f"multipart/form-data; boundary={limite}"},
            ).decode("utf-8")
        )
    except (ImportError, ValueError, UnicodeDecodeError, OSError):
        return None

    return Foto.objects.create(
        atractivo=atractivo,
        public_id=str(respuesta.get("public_id", ""))[:300],
        url=str(respuesta.get("secure_url", ""))[:500],
        ancho=int(respuesta.get("width") or 0) or None,
        alto=int(respuesta.get("height") or 0) or None,
        orden=atractivo.fotos.count(),
        tipo=Foto.TIPO_IMAGEN,
        estado=Foto.ESTADO_COMPLETED,
        url_origen=imagen.pagina_origen[:500],
        licencia=imagen.licencia[:100],
        atribucion=imagen.atribucion[:2000],
    )


def enriquecer_con_imagen(
    atractivo: Atractivo,
    terminos: str,
    *,
    titulo: str = "",
    origenes_obsoletos: tuple[str, ...] = (),
) -> str:
    """Busca, descarga, sube y devuelve la atribución encontrada.

    Las fotos obsoletas solo se retiran después de confirmar que la foto nueva
    existe para el atractivo. Así, un fallo de Commons o Cloudinary nunca deja
    el destino sin imagen.
    """

    if not titulo and not terminos:
        return ""
    imagen = obtener_imagen(titulo) if titulo else None
    if imagen is None and terminos:
        imagen = buscar_imagen(terminos)
    if imagen is None:
        return ""
    archivo = descargar_imagen(imagen)
    if not archivo:
        return ""
    foto = subir_imagen(atractivo, imagen, archivo)
    if foto is None:
        foto = Foto.objects.filter(
            atractivo=atractivo, url_origen=imagen.pagina_origen
        ).first()
    if foto is None:
        return ""
    if origenes_obsoletos:
        atractivo.fotos.filter(url_origen__in=origenes_obsoletos).exclude(
            pk=foto.pk
        ).delete()
    return foto.atribucion
