from __future__ import annotations

from celery import shared_task
from django.conf import settings

from .ollama import OllamaNoDisponible
from .scraping import ErrorDescarga
from .services import ingerir_url
from .vectorization import vectorizar_fragmentos


@shared_task(
    bind=True,
    autoretry_for=(ErrorDescarga, OllamaNoDisponible),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=3,
)
def scrapear_fuente_task(self, url: str, id_atractivo: str | None = None) -> dict:
    resultado = ingerir_url(url, id_atractivo=id_atractivo)
    vectorizados = 0
    if settings.SCRAPER_AUTO_EMBED:
        vectorizacion = vectorizar_fragmentos(id_fuente=resultado.id_fuente)
        vectorizados = vectorizacion.vectorizados
    return {
        "id_fuente": str(resultado.id_fuente),
        "url": resultado.url,
        "fragmentos": resultado.fragmentos,
        "actualizado": resultado.actualizado,
        "vectorizados": vectorizados,
    }


@shared_task(
    bind=True,
    autoretry_for=(OllamaNoDisponible,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=3,
)
def vectorizar_fragmentos_task(
    self, id_fuente: str | None = None, forzar: bool = False
) -> dict:
    resultado = vectorizar_fragmentos(id_fuente=id_fuente, forzar=forzar)
    return {
        "examinados": resultado.examinados,
        "vectorizados": resultado.vectorizados,
        "modelo": resultado.modelo,
        "dimension": resultado.dimension,
    }
