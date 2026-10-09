"""Tareas asíncronas de medios (diseño híbrido aprobado).

Flujo: la API recibe el archivo, lo guarda en staging compartido y
encola `subir_foto_task`. El worker sube a Cloudinary, guarda URL y
limpia el temporal. La BD es la fuente de verdad (estado por Foto).
"""

from __future__ import annotations

import logging
import time
from pathlib import Path

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

MAX_BYTES_IMAGEN = 10 * 1024 * 1024
MAX_BYTES_VIDEO = 100 * 1024 * 1024


def _staging() -> Path:
    ruta = Path(settings.STAGING_DIR)
    ruta.mkdir(parents=True, exist_ok=True)
    return ruta


def _carpeta_cloud(atractivo) -> str:
    slug = atractivo.slug or "sin-slug"
    return f"atractivos/{atractivo.id_atractivo}-{slug}"


@shared_task(bind=True, max_retries=0)
def subir_foto_task(self, id_foto: int, nombre_archivo: str) -> str:
    """Sube el temporal a Cloudinary y completa la Foto."""
    from turismo.models import Foto

    try:
        foto = Foto.objects.select_related("atractivo").get(pk=id_foto)
    except Foto.DoesNotExist:
        logger.warning("Foto %s inexistente, nada que subir.", id_foto)
        return "inexistente"

    ruta = _staging() / Path(nombre_archivo).name
    foto.estado = Foto.ESTADO_PROCESSING
    foto.save(update_fields=["estado"])
    try:
        if not ruta.is_file():
            raise FileNotFoundError(f"Temporal ausente: {ruta.name}")
        try:
            import cloudinary
            from cloudinary.uploader import upload
        except ImportError as exc:
            raise RuntimeError("SDK cloudinary no instalado.") from exc
        configuracion = {
            "cloud_name": settings.CLOUDINARY.get("cloud_name"),
            "api_key": settings.CLOUDINARY.get("api_key"),
            "api_secret": settings.CLOUDINARY.get("api_secret"),
            "secure": True,
        }
        if not all(configuracion[k] for k in ("cloud_name", "api_key", "api_secret")):
            raise RuntimeError("Cloudinary no configurado.")
        cloudinary.config(**configuracion)
        resource = "video" if foto.tipo == Foto.TIPO_VIDEO else "image"
        resultado = upload(
            str(ruta),
            folder=_carpeta_cloud(foto.atractivo),
            resource_type=resource,
            unique_filename=True,
            overwrite=False,
        )
        foto.public_id = resultado["public_id"]
        foto.url = resultado["secure_url"]
        foto.ancho = resultado.get("width")
        foto.alto = resultado.get("height")
        foto.estado = Foto.ESTADO_COMPLETED
        foto.save()
        logger.info("Foto %s subida: %s", id_foto, foto.public_id)
        return foto.public_id
    except Exception as exc:
        foto.estado = Foto.ESTADO_FAILED
        foto.save(update_fields=["estado"])
        logger.error("Fallo subida foto %s: %s", id_foto, exc)
        raise
    finally:
        try:
            if ruta.is_file():
                ruta.unlink()
        except OSError:
            pass


@shared_task
def purgar_staging(max_horas: int = 24) -> int:
    """Elimina temporales huérfanos (beat cada hora)."""
    base = Path(settings.STAGING_DIR)
    if not base.is_dir():
        return 0
    limite = time.time() - max_horas * 3600
    purgados = 0
    for hijo in base.iterdir():
        try:
            if hijo.is_file() and hijo.stat().st_mtime < limite:
                hijo.unlink()
                purgados += 1
        except OSError:
            continue
    if purgados:
        logger.info("Staging purgado: %s archivos.", purgados)
    return purgados


def tamano_maximo(tipo: str) -> int:
    return MAX_BYTES_VIDEO if tipo == "video" else MAX_BYTES_IMAGEN


def nombre_temporal(id_foto: int, extension: str) -> str:
    return f"foto-{id_foto}.{extension}"
