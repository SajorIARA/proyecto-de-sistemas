from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .fuentes_abiertas import FUENTES_DISPONIBLES
from .importacion_lugares import crear_importacion
from .models import FuenteDocumental, ImportacionLugares, LugarCandidato
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


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def importar_lugares_abiertos_task(
    self,
    consulta: str,
    ciudad: str = "La Paz",
    fuentes=None,
    limite: int = 20,
    id_importacion: str | None = None,
) -> dict:
    """Descubre lugares en segundo plano (llamada desde el admin)."""

    seleccionadas = tuple(fuentes) if fuentes else FUENTES_DISPONIBLES
    try:
        resultado = crear_importacion(
            consulta,
            ciudad=ciudad,
            fuentes=seleccionadas,
            limite=limite,
            id_importacion=id_importacion,
        )
    except Exception as exc:
        if id_importacion:
            ImportacionLugares.objects.filter(pk=id_importacion).update(
                estado=ImportacionLugares.ESTADO_ERROR,
                error=str(exc)[:2000],
                fecha_actualizacion=timezone.now(),
            )
        raise
    return {
        "id_importacion": str(resultado.id_importacion),
        "encontrados": resultado.encontrados,
        "creados": resultado.creados,
        "duplicados": resultado.duplicados,
        "errores": resultado.errores,
    }


@shared_task(
    bind=True,
    autoretry_for=(OllamaNoDisponible,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=3,
)
def vectorizar_importacion_task(self, id_importacion: str) -> dict:
    """Vectoriza solo las fuentes aprobadas de una importación.

    Si Ollama no responde, el estado queda en ``error`` con un mensaje
    visible: la UI nunca debe mostrar éxito RAG cuando no hay embeddings.
    """

    importacion = ImportacionLugares.objects.get(pk=id_importacion)
    try:
        ids_atractivos = list(
            LugarCandidato.objects.filter(
                importacion=importacion,
                estado=LugarCandidato.ESTADO_APROBADO,
                atractivo__isnull=False,
            )
            .exclude(atractivo_id=None)
            .values_list("atractivo_id", flat=True)
            .distinct()
        )
        ids_fuentes = list(
            FuenteDocumental.objects.filter(
                atractivo_id__in=ids_atractivos, tipo="fuente_abierta"
            ).values_list("id_fuente", flat=True)
        )
        vectorizados = sum(
            vectorizar_fragmentos(id_fuente=id_fuente).vectorizados
            for id_fuente in ids_fuentes
        )
    except Exception as exc:
        importacion.estado_vectorizacion = ImportacionLugares.VECTORIZACION_ERROR
        importacion.error_vectorizacion = str(exc)[:500]
        importacion.save(
            update_fields=["estado_vectorizacion", "error_vectorizacion"]
        )
        raise
    importacion.estado_vectorizacion = ImportacionLugares.VECTORIZACION_COMPLETADO
    importacion.error_vectorizacion = ""
    importacion.vectorizado_en = timezone.now()
    importacion.save(
        update_fields=[
            "estado_vectorizacion",
            "error_vectorizacion",
            "vectorizado_en",
        ]
    )
    return {"fuentes": len(ids_fuentes), "vectorizados": vectorizados}
