"""Ingesta idempotente de páginas web en el dominio de conocimiento."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from uuid import UUID

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from turismo.models import Atractivo

from .models import FragmentoDocumental, FuenteDocumental
from .scraping import ScrapingError, scrapear_url, validar_url


@dataclass(frozen=True)
class ResultadoIngesta:
    id_fuente: UUID
    url: str
    titulo: str
    fragmentos: int
    actualizado: bool


def fragmentar_texto(
    texto: str, tamano: int = 1200, solapamiento: int = 200
) -> list[str]:
    """Divide por palabras respetando un máximo aproximado y solapamiento."""

    if tamano < 200:
        raise ValueError("El tamaño de fragmento debe ser al menos 200 caracteres.")
    if solapamiento < 0 or solapamiento >= tamano:
        raise ValueError("El solapamiento debe estar entre 0 y tamano-1.")
    palabras = re.findall(r"\S+", texto)
    if not palabras:
        return []
    fragmentos: list[str] = []
    inicio = 0
    while inicio < len(palabras):
        fin = inicio
        longitud = 0
        while fin < len(palabras):
            incremento = len(palabras[fin]) + (1 if fin > inicio else 0)
            if fin > inicio and longitud + incremento > tamano:
                break
            longitud += incremento
            fin += 1
        fragmento = " ".join(palabras[inicio:fin]).strip()
        if fragmento:
            fragmentos.append(fragmento)
        if fin >= len(palabras):
            break
        retroceso = 0
        nuevo_inicio = fin
        while nuevo_inicio > inicio and retroceso < solapamiento:
            nuevo_inicio -= 1
            retroceso += len(palabras[nuevo_inicio]) + 1
        inicio = max(inicio + 1, nuevo_inicio)
    return fragmentos


def _opciones_scraper(dominios_permitidos=None) -> dict:
    return {
        "dominios_permitidos": tuple(
            dominios_permitidos
            if dominios_permitidos is not None
            else settings.SCRAPER_ALLOWED_DOMAINS
        ),
        "user_agent": settings.SCRAPER_USER_AGENT,
        "timeout": settings.SCRAPER_TIMEOUT_SECONDS,
        "max_bytes": settings.SCRAPER_MAX_BYTES,
        "max_redirects": settings.SCRAPER_MAX_REDIRECTS,
        "intervalo": settings.SCRAPER_MIN_INTERVAL_SECONDS,
    }


def ingerir_url(
    url: str,
    *,
    id_atractivo: str | UUID | None = None,
    dominios_permitidos=None,
) -> ResultadoIngesta:
    opciones = _opciones_scraper(dominios_permitidos)
    url_normalizada = validar_url(url, opciones["dominios_permitidos"])
    atractivo = None
    if id_atractivo:
        atractivo = Atractivo.objects.get(pk=id_atractivo)

    fuente, _ = FuenteDocumental.objects.get_or_create(
        url=url_normalizada,
        defaults={
            "titulo": url_normalizada[:250],
            "tipo": "web",
            "atractivo": atractivo,
        },
    )
    fuente.estado_scraping = FuenteDocumental.ESTADO_PENDIENTE
    fuente.error_scraping = ""
    if atractivo is not None:
        fuente.atractivo = atractivo
    fuente.save(update_fields=["estado_scraping", "error_scraping", "atractivo"])

    try:
        documento = scrapear_url(url_normalizada, **opciones)
        fragmentos = fragmentar_texto(
            documento.texto,
            settings.SCRAPER_CHUNK_CHARS,
            settings.SCRAPER_CHUNK_OVERLAP_CHARS,
        )
        if not fragmentos:
            raise ScrapingError("No se generaron fragmentos útiles.")
        digest = hashlib.sha256(documento.texto.encode("utf-8")).hexdigest()
        with transaction.atomic():
            fuente = FuenteDocumental.objects.select_for_update().get(pk=fuente.pk)
            sin_cambios = (
                fuente.hash_contenido == digest and fuente.fragmentos.exists()
            )
            fuente.titulo = documento.titulo
            fuente.tipo = "web"
            fuente.hash_contenido = digest
            fuente.estado_scraping = FuenteDocumental.ESTADO_COMPLETADO
            fuente.error_scraping = ""
            fuente.fecha_actualizacion = timezone.now()
            fuente.save()
            if not sin_cambios:
                fuente.fragmentos.all().delete()
                FragmentoDocumental.objects.bulk_create(
                    [
                        FragmentoDocumental(
                            fuente=fuente,
                            numero_fragmento=numero,
                            contenido=contenido,
                            embedding=None,
                        )
                        for numero, contenido in enumerate(fragmentos)
                    ]
                )
        return ResultadoIngesta(
            id_fuente=fuente.id_fuente,
            url=documento.url,
            titulo=documento.titulo,
            fragmentos=len(fragmentos),
            actualizado=not sin_cambios,
        )
    except Exception as exc:
        fuente.estado_scraping = FuenteDocumental.ESTADO_ERROR
        fuente.error_scraping = str(exc)[:2000]
        fuente.fecha_actualizacion = timezone.now()
        fuente.save(
            update_fields=["estado_scraping", "error_scraping", "fecha_actualizacion"]
        )
        raise
