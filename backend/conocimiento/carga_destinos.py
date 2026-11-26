"""Carga idempotente de los 30 destinos solicitados, sin aprobación manual.

La aprobación administrativa sigue disponible para futuras importaciones; esta
carga es una publicación directa y trazable de una lista decidida por el
usuario. Cada dato se guarda con la URL de la fuente que lo respalda.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

from django.conf import settings
from django.contrib.gis.geos import Point
from django.db import transaction

from turismo.models import Atractivo, Categoria

from .destinos_listado import DESTINOS_SOLICITADOS, DestinoSolicitado
from .fichas_oficiales import (
    NO_VERIFICADO,
    extraer_secciones,
    texto_para_rag,
    valor_seccion,
)
from .imagenes_destinos import enriquecer_con_imagen
from .models import FragmentoDocumental, FuenteDocumental
from .salida_proxy import solicitar
from .services import fragmentar_texto


@dataclass(frozen=True)
class ResultadoCarga:
    destinos: int
    atractivos_creados: int
    fuentes_actualizadas: int
    fotos_agregadas: int
    fragmentos: int
    errores: tuple[str, ...]


@dataclass(frozen=True)
class DestinoEnriquecido:
    descripcion: str
    horario: str
    costo: str
    direccion: str
    aviso: str


def enriquecer_destino(destino: DestinoSolicitado) -> DestinoEnriquecido:
    """Descarga la ficha oficial y extrae sus secciones declaradas.

    La ficha manda; si no publica un campo se conserva el valor verificado
    durante la investigación. Nunca se inventan horarios ni precios.
    """

    secciones: dict[str, str] = {}
    aviso = ""
    if destino.ficha_url:
        try:
            secciones = extraer_secciones(
                solicitar(destino.ficha_url), url=destino.ficha_url
            )
        except (OSError, ValueError) as exc:
            aviso = f"{destino.nombre}: ficha no descargable ({exc})."

    def valor(clave: str, respaldo: str) -> str:
        extraido = valor_seccion(secciones, clave)
        if extraido != NO_VERIFICADO:
            return extraido
        return respaldo or NO_VERIFICADO

    return DestinoEnriquecido(
        descripcion=valor("descripcion", destino.descripcion),
        horario=valor("horario", destino.horario),
        costo=valor("costo", destino.costo),
        direccion=valor("direccion", destino.direccion),
        aviso=aviso,
    )


def _asegurar_atractivo(
    destino: DestinoSolicitado, enriquecido: DestinoEnriquecido
) -> tuple[Atractivo, bool]:
    categoria, _ = Categoria.objects.get_or_create(
        nombre__iexact=destino.categoria,
        defaults={"nombre": destino.categoria[:100]},
    )
    atractivo = Atractivo.objects.filter(nombre__iexact=destino.nombre).first()
    creado = atractivo is None
    if creado:
        atractivo = Atractivo(nombre=destino.nombre, activo=True)
    atractivo.descripcion = enriquecido.descripcion[:10000]
    atractivo.direccion = (enriquecido.direccion or None) or None
    if len(atractivo.direccion or "") > 300:
        atractivo.direccion = atractivo.direccion[:300]
    atractivo.url = (destino.ficha_url or destino.url_oficial or "")[:500] or None
    atractivo.fuente_origen = "LAPAZ.BO+OSM+WIKIMEDIA"[:100]
    atractivo.activo = True
    if destino.latitud is not None and destino.longitud is not None:
        atractivo.ubicacion = Point(destino.longitud, destino.latitud, srid=4326)
    atractivo.save()
    atractivo.categorias.add(categoria)
    return atractivo, creado


def _asegurar_fuente(
    atractivo: Atractivo, destino: DestinoSolicitado, enriquecido: DestinoEnriquecido, atribucion: str
) -> int:
    contenido = texto_para_rag(
        destino.nombre,
        categoria=destino.categoria,
        descripcion=enriquecido.descripcion,
        horario=enriquecido.horario,
        costo=enriquecido.costo,
        direccion=enriquecido.direccion,
        url_fuente=destino.ficha_url or destino.url_oficial,
        url_coordenadas=destino.url_coordenadas,
        latitud=destino.latitud,
        longitud=destino.longitud,
        imagen_atribucion=atribucion,
    )
    digest = hashlib.sha256(contenido.encode("utf-8")).hexdigest()
    url = f"{destino.ficha_url or destino.url_oficial or destino.url_coordenadas}#{atractivo.slug}"
    with transaction.atomic():
        fuente = FuenteDocumental.objects.filter(url=url).first()
        if fuente is None:
            fuente = FuenteDocumental(url=url)
        sin_cambios = bool(
            fuente.pk and fuente.hash_contenido == digest and fuente.fragmentos.exists()
        )
        fuente.titulo = f"{destino.nombre} — ficha verificada"
        fuente.tipo = "ficha_oficial"
        fuente.atractivo = atractivo
        fuente.hash_contenido = digest
        fuente.estado_scraping = FuenteDocumental.ESTADO_COMPLETADO
        fuente.error_scraping = ""
        from django.utils import timezone

        fuente.fecha_actualizacion = timezone.now()
        fuente.save()
        if sin_cambios:
            return fuente.fragmentos.count()
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
        return len(fragmentos)


def cargar_destinos(*, con_imagenes: bool = True) -> ResultadoCarga:
    """Publica o actualiza los destinos de la lista; puede repetirse."""

    from turismo.models import Foto

    creados = 0
    fuentes = 0
    fotos_antes = Foto.objects.count()
    fragmentos = 0
    errores: list[str] = []

    for destino in DESTINOS_SOLICITADOS:
        try:
            enriquecido = enriquecer_destino(destino)
            atractivo, creado = _asegurar_atractivo(destino, enriquecido)
            creados += int(creado)
            atribucion = ""
            if con_imagenes:
                atribucion = enriquecer_con_imagen(
                    atractivo,
                    destino.terminos_imagen,
                    titulo=destino.archivo_commons,
                    origenes_obsoletos=destino.origenes_imagen_obsoletos,
                )
            if enriquecido.aviso:
                errores.append(enriquecido.aviso)
            fragmentos += _asegurar_fuente(atractivo, destino, enriquecido, atribucion)
            fuentes += 1
        except Exception as exc:  # un destino no bloquea los demás
            errores.append(f"{destino.nombre}: {type(exc).__name__}: {exc}"[:500])
    return ResultadoCarga(
        destinos=len(DESTINOS_SOLICITADOS),
        atractivos_creados=creados,
        fuentes_actualizadas=fuentes,
        fotos_agregadas=Foto.objects.count() - fotos_antes,
        fragmentos=fragmentos,
        errores=tuple(errores),
    )
