"""Ingesta idempotente de páginas web en el dominio de conocimiento."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from uuid import UUID

from django.conf import settings
from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone

from turismo.models import Atractivo, Categoria

from .models import (
    FragmentoDocumental,
    FuenteDocumental,
    ImportacionLugares,
    LugarCandidato,
)
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
            sin_cambios = fuente.hash_contenido == digest and fuente.fragmentos.exists()
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


@dataclass(frozen=True)
class ResultadoAprobacion:
    id_atractivo: UUID
    id_fuente: UUID
    fragmentos: int
    actualizado: bool
    vectorizacion_encolada: bool


def _texto_candidato(
    candidato: LugarCandidato, categoria: str, duracion_minutos: int
) -> str:
    """Texto explícito y trazable: nunca completa datos que la fuente no dio."""

    consulta = candidato.importacion.fecha_creacion.date().isoformat()
    return "\n".join(
        (
            f"Lugar: {candidato.nombre}.",
            f"Categoría revisada por un administrador: {categoria}.",
            "Categoría sugerida por la fuente: "
            f"{candidato.categoria_sugerida or 'No declarada'}.",
            "Descripción declarada: "
            f"{candidato.descripcion or 'No disponible en la fuente.'}",
            f"Dirección declarada: {candidato.direccion or 'No verificada'}.",
            f"Horario declarado: {candidato.horario_declarado or 'No verificado'}.",
            f"Sitio web declarado: {candidato.sitio_web or 'No verificado'}.",
            f"Duración asignada por el administrador: {duracion_minutos} minutos.",
            f"Fuente: {candidato.url_fuente or 'No declarada'}.",
            f"Licencia: {candidato.licencia or 'No declarada'}.",
            f"Fecha de consulta: {consulta}.",
        )
    )


def encolar_importacion(
    id_importacion: UUID,
    *,
    consulta: str,
    ciudad: str,
    fuentes: list[str],
    limite: int,
) -> bool:
    """Encola el descubrimiento; si el broker falla, deja el error visible.

    El endpoint devuelve 202 solo cuando la tarea entró en la cola. Un broker
    caído marca la importación como ``error`` con el motivo real.
    """

    from .tasks import importar_lugares_abiertos_task

    try:
        # Argumentos por nombre: el id va al parámetro correcto incluso si
        # la firma de la tarea crece en el futuro.
        importar_lugares_abiertos_task.delay(
            consulta=consulta,
            ciudad=ciudad,
            fuentes=list(fuentes),
            limite=limite,
            id_importacion=str(id_importacion),
        )
        return True
    except Exception as exc:
        ImportacionLugares.objects.filter(pk=id_importacion).update(
            estado=ImportacionLugares.ESTADO_ERROR,
            error=f"No se pudo encolar la importación: {exc}"[:2000],
            fecha_actualizacion=timezone.now(),
        )
        return False


def encolar_vectorizacion(id_importacion: UUID) -> bool:
    """Encola embeddings; si el broker falla, deja el error visible.

    Nunca se reporta éxito cuando la tarea ni siquiera pudo encolarse. Se
    llama desde ``transaction.on_commit`` para no indexar una escritura que
    fue rollback.
    """

    from .tasks import vectorizar_importacion_task

    try:
        vectorizar_importacion_task.delay(str(id_importacion))
        return True
    except Exception as exc:  # broker caído, Redis inaccesible, serializer…
        importacion = ImportacionLugares.objects.filter(pk=id_importacion).first()
        if importacion is not None:
            importacion.estado_vectorizacion = ImportacionLugares.VECTORIZACION_ERROR
            importacion.error_vectorizacion = str(exc)[:500]
            importacion.save(
                update_fields=["estado_vectorizacion", "error_vectorizacion"]
            )
        return False


def aprobar_lugar_candidato(
    candidato: LugarCandidato, *, categoria: str, duracion_minutos: int
) -> ResultadoAprobacion:
    """Convierte un candidato revisado en destino, fuente y fragmentos RAG.

    Solo se llama después de la revisión administrativa. La vectorización se
    encola al confirmar la transacción: si el guardado falla, no se indexa
    información a medio publicar.
    """

    if candidato.estado == LugarCandidato.ESTADO_RECHAZADO:
        raise ValueError("Un candidato rechazado no puede aprobarse.")
    categoria_limpia = (categoria or "").strip()
    if not categoria_limpia:
        raise ValueError("La categoría revisada es obligatoria para aprobar.")
    if candidato.latitud is None or candidato.longitud is None:
        raise ValueError("El candidato no tiene coordenadas verificables.")
    try:
        duracion = int(duracion_minutos)
    except (TypeError, ValueError) as exc:
        raise ValueError("La duración debe ser un número entero de minutos.") from exc
    if not 1 <= duracion <= 10080:
        raise ValueError("La duración debe estar entre 1 y 10080 minutos.")

    with transaction.atomic():
        # select_related solo sobre la FK obligatoria: con ``atractivo``
        # (nullable) Postgres rechaza FOR UPDATE sobre el outer join.
        candidato = (
            LugarCandidato.objects.select_for_update()
            .select_related("importacion")
            .get(pk=candidato.pk)
        )
        categoria_obj = Categoria.objects.filter(
            nombre__iexact=categoria_limpia
        ).first()
        if categoria_obj is None:
            categoria_obj = Categoria.objects.create(nombre=categoria_limpia[:100])

        atractivo = candidato.atractivo
        if atractivo is None:
            atractivo = Atractivo.objects.filter(
                nombre__iexact=candidato.nombre.strip()
            ).first()
        creado = atractivo is None
        if creado:
            atractivo = Atractivo(
                nombre=candidato.nombre,
                descripcion=(
                    candidato.descripcion
                    or "Descripción no declarada en la fuente; requiere revisión."
                ),
                direccion=candidato.direccion or None,
                duracion_minutos=duracion,
                ubicacion=Point(candidato.longitud, candidato.latitud, srid=4326),
                fuente_origen=candidato.fuente.upper(),
                activo=True,
            )
        else:
            # Un destino ya verificado (p. ej. del portal municipal) conserva
            # su descripción y coordenadas: esta importación solo añade una
            # evidencia nueva y la duración revisada.
            if atractivo.fuente_origen.upper() == candidato.fuente.upper():
                atractivo.descripcion = (
                    candidato.descripcion
                    or "Descripción no declarada en la fuente; requiere revisión."
                )
                atractivo.direccion = candidato.direccion or None
                atractivo.ubicacion = Point(
                    candidato.longitud, candidato.latitud, srid=4326
                )
            atractivo.duracion_minutos = duracion
            atractivo.activo = True
        if candidato.sitio_web or candidato.url_fuente:
            atractivo.url = (candidato.sitio_web or candidato.url_fuente)[:500]
        atractivo.save()
        atractivo.categorias.add(categoria_obj)

        contenido = _texto_candidato(candidato, categoria_limpia, duracion)
        digest = hashlib.sha256(contenido.encode("utf-8")).hexdigest()
        url_fuente = candidato.url_fuente or f"{candidato.fuente}://{candidato.id_externo}"
        fuente = FuenteDocumental.objects.filter(url=url_fuente).first()
        if fuente is None:
            fuente = FuenteDocumental(
                url=url_fuente,
                titulo=f"{candidato.nombre} — {candidato.fuente}",
            )
        sin_cambios = fuente.pk is not None and (
            fuente.hash_contenido == digest and fuente.fragmentos.exists()
        )
        fuente.titulo = f"{candidato.nombre} — {candidato.fuente}"
        fuente.tipo = "fuente_abierta"
        fuente.atractivo = atractivo
        fuente.hash_contenido = digest
        fuente.estado_scraping = FuenteDocumental.ESTADO_COMPLETADO
        fuente.error_scraping = ""
        fuente.fecha_actualizacion = timezone.now()
        fuente.save()
        if not sin_cambios:
            fuente.fragmentos.all().delete()
            fragmentos = fragmentar_texto(
                contenido,
                settings.SCRAPER_CHUNK_CHARS,
                settings.SCRAPER_CHUNK_OVERLAP_CHARS,
            )
            FragmentoDocumental.objects.bulk_create(
                [
                    FragmentoDocumental(
                        fuente=fuente,
                        numero_fragmento=numero,
                        contenido=texto,
                        embedding=None,
                    )
                    for numero, texto in enumerate(fragmentos)
                ]
            )
        else:
            fragmentos = list(fuente.fragmentos.values_list("contenido", flat=True))

        candidato.estado = LugarCandidato.ESTADO_APROBADO
        candidato.categoria = categoria_limpia[:100]
        candidato.duracion_minutos = duracion
        candidato.atractivo = atractivo
        candidato.save(
            update_fields=["estado", "categoria", "duracion_minutos", "atractivo"]
        )

        importacion = ImportacionLugares.objects.get(pk=candidato.importacion_id)
        importacion.estado_vectorizacion = ImportacionLugares.VECTORIZACION_PENDIENTE
        importacion.error_vectorizacion = ""
        importacion.save(
            update_fields=["estado_vectorizacion", "error_vectorizacion"]
        )

    estado_envio = {"encolada": True}

    def al_confirmar() -> None:
        estado_envio["encolada"] = encolar_vectorizacion(importacion.id_importacion)

    transaction.on_commit(al_confirmar)
    return ResultadoAprobacion(
        id_atractivo=atractivo.id_atractivo,
        id_fuente=fuente.id_fuente,
        fragmentos=len(fragmentos),
        actualizado=not sin_cambios,
        # Si el callback se ejecuta diferido (transacción externa), el estado
        # real se consulta después en el detalle de la importación.
        vectorizacion_encolada=estado_envio["encolada"],
    )


def rechazar_lugar_candidato(
    candidato: LugarCandidato, *, notas: str = ""
) -> LugarCandidato:
    """Descarta un candidato sin crear destino, fuente ni fragmentos."""

    if candidato.estado == LugarCandidato.ESTADO_APROBADO:
        raise ValueError("Un candidato aprobado no puede rechazarse.")
    candidato.estado = LugarCandidato.ESTADO_RECHAZADO
    candidato.notas_revision = notas[:2000]
    candidato.save(update_fields=["estado", "notas_revision"])
    return candidato
