"""Catálogo mínimo, trazable y revisable de destinos turísticos de La Paz.

Cada entrada exige una página institucional y una fuente independiente de
coordenadas. No descubre destinos ni infiere coordenadas.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone

from turismo.models import Atractivo, Categoria

from .models import FragmentoDocumental, FuenteDocumental


@dataclass(frozen=True)
class DestinoVerificado:
    nombre: str
    categoria: str
    descripcion: str
    url_oficial: str
    url_coordenadas: str
    longitud: float
    latitud: float


DESTINOS_LA_PAZ: tuple[DestinoVerificado, ...] = (
    DestinoVerificado(
        nombre="Valle de la Luna",
        categoria="Naturaleza",
        descripcion=(
            "Área municipal protegida de formaciones rocosas arcillosas erosionadas, "
            "con obeliscos, surcos, cárcavas y cráteres. El portal turístico municipal "
            "indica horario diario de 09:00 a 18:00 y recomienda visitarlo en época seca."
        ),
        url_oficial="https://lapaz.bo/turismo/mallasa-valle-de-la-luna/",
        url_coordenadas="https://en.wikipedia.org/wiki/Valle_de_la_Luna_(Bolivia)",
        longitud=-68.09444444,
        latitud=-16.56722222,
    ),
    DestinoVerificado(
        nombre="Basílica Menor de San Francisco",
        categoria="Cultura",
        descripcion=(
            "Templo católico ubicado en el centro de La Paz, destacado por su "
            "arquitectura barroca mestiza, su portada tallada en piedra y retablos "
            "con técnica de pan de oro. El portal municipal publica horarios de visita."
        ),
        url_oficial="https://lapaz.bo/turismo/centro-basilica-menor-de-san-francisco",
        url_coordenadas=(
            "https://en.wikipedia.org/wiki/Basilica_of_San_Francisco%2C_La_Paz"
        ),
        longitud=-68.1373,
        latitud=-16.4965,
    ),
    DestinoVerificado(
        nombre="Bioparque Municipal Vesty Pakos",
        categoria="Naturaleza",
        descripcion=(
            "Bioparque municipal de Mallasa dedicado a conservación, educación y "
            "recreación vinculada con fauna regional y nacional."
        ),
        url_oficial="https://lapaz.bo/turismo/mallasa-bioparque-vesty-pakos/",
        url_coordenadas="https://www.openstreetmap.org/way/44393086",
        longitud=-68.0810391,
        latitud=-16.5737241,
    ),
    DestinoVerificado(
        nombre="Cerro Muela del Diablo",
        categoria="Naturaleza",
        descripcion=(
            "Formación natural y mirador de la zona sur, reconocida por el portal "
            "turístico municipal como patrimonio natural y paisajístico."
        ),
        url_oficial="https://lapaz.bo/turismo/mallasa-muela-del-diablo/",
        url_coordenadas="https://www.openstreetmap.org/node/2607905325",
        longitud=-68.0572136,
        latitud=-16.5626041,
    ),
    DestinoVerificado(
        nombre="Mirador Killi Killi",
        categoria="Mirador",
        descripcion=(
            "Mirador urbano de la zona Periférica con vista panorámica de la ciudad "
            "de La Paz, incluido por el portal municipal entre los sitios históricos."
        ),
        url_oficial="https://lapaz.bo/turismo/periferica/",
        url_coordenadas="https://www.openstreetmap.org/way/194457937",
        longitud=-68.1275289,
        latitud=-16.4951376,
    ),
    DestinoVerificado(
        nombre="Mercado de las Brujas",
        categoria="Cultura",
        descripcion=(
            "Mercado tradicional del centro de La Paz asociado a prácticas "
            "espirituales andinas, artesanías, hierbas y productos culturales."
        ),
        url_oficial="https://lapaz.bo/turismo/centro-mercado-de-las-brujas/",
        url_coordenadas="https://www.openstreetmap.org/node/7280293747",
        longitud=-68.1391523,
        latitud=-16.4962388,
    ),
    DestinoVerificado(
        nombre="Plaza Murillo",
        categoria="Patrimonio",
        descripcion=(
            "Plaza histórica del centro de La Paz, vinculada al recorrido cívico e "
            "institucional de la ciudad."
        ),
        url_oficial="https://lapaz.bo/turismo/centro-plaza-murillo/",
        url_coordenadas="https://en.wikipedia.org/wiki/Plaza_Murillo",
        longitud=-68.1336,
        latitud=-16.4958,
    ),
)


def _actualizar_fuente(
    *, atractivo: Atractivo, url: str, titulo: str, contenido: str, tipo: str
) -> int:
    digest = hashlib.sha256(contenido.encode("utf-8")).hexdigest()
    fuente, _ = FuenteDocumental.objects.get_or_create(
        url=url,
        defaults={"titulo": titulo, "tipo": tipo, "atractivo": atractivo},
    )
    sin_cambios = fuente.hash_contenido == digest and fuente.fragmentos.exists()
    fuente.titulo = titulo
    fuente.tipo = tipo
    fuente.atractivo = atractivo
    fuente.hash_contenido = digest
    fuente.estado_scraping = FuenteDocumental.ESTADO_COMPLETADO
    fuente.error_scraping = ""
    fuente.fecha_actualizacion = timezone.now()
    fuente.save()
    if not sin_cambios:
        fuente.fragmentos.all().delete()
        FragmentoDocumental.objects.create(
            fuente=fuente, numero_fragmento=0, contenido=contenido, embedding=None
        )
    return 0 if sin_cambios else 1


def ingestar_destinos_verificados() -> tuple[int, int]:
    """Crea/actualiza destinos y sus dos evidencias documentales de forma idempotente."""

    atractivos = fuentes_actualizadas = 0
    with transaction.atomic():
        for destino in DESTINOS_LA_PAZ:
            categoria, _ = Categoria.objects.get_or_create(nombre=destino.categoria)
            valores = {
                "nombre": destino.nombre,
                "descripcion": destino.descripcion,
                "ubicacion": Point(destino.longitud, destino.latitud, srid=4326),
                "fuente_origen": "GAMLP+OPENSTREETMAP",
                "activo": True,
            }
            atractivo = Atractivo.objects.filter(url=destino.url_oficial).first()
            if atractivo is None:
                atractivo = Atractivo.objects.filter(nombre=destino.nombre).first()
            creado = atractivo is None
            if creado:
                atractivo = Atractivo(url=destino.url_oficial, **valores)
            else:
                atractivo.url = destino.url_oficial
                for campo, valor in valores.items():
                    setattr(atractivo, campo, valor)
            atractivo.save()
            atractivo.categorias.add(categoria)
            atractivos += int(creado)
            fuentes_actualizadas += _actualizar_fuente(
                atractivo=atractivo,
                url=destino.url_oficial,
                titulo=f"{destino.nombre} — portal turístico municipal",
                tipo="institucional",
                contenido=(
                    f"Destino: {destino.nombre}\n"
                    f"Fuente institucional: {destino.url_oficial}\n"
                    f"{destino.descripcion}"
                ),
            )
            fuentes_actualizadas += _actualizar_fuente(
                atractivo=atractivo,
                url=destino.url_coordenadas,
                titulo=f"{destino.nombre} — verificación de coordenadas",
                tipo="verificacion_geografica",
                contenido=(
                    f"Coordenadas verificadas para {destino.nombre}: "
                    f"latitud {destino.latitud}, longitud {destino.longitud}. "
                    f"Fuente secundaria de coordenadas: {destino.url_coordenadas}"
                ),
            )
    return atractivos, fuentes_actualizadas
