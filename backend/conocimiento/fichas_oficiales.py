"""Extracción trazable de fichas públicas de destinos (sin Google).

Las fichas de lapaz.bo/turismo publican secciones ``DESCRIPCIÓN``,
``HORARIO`` y ``COSTO``. Este módulo conserva el texto literal de cada
sección; cuando la fuente no lo declara, el valor es ``No verificado``.
"""

from __future__ import annotations

import re

from .scraping import extraer_documento

NO_VERIFICADO = "No verificado"

ETIQUETAS = {
    "DESCRIPCIÓN": "descripcion",
    "DESCRIPCION": "descripcion",
    "HORARIO": "horario",
    "COSTO": "costo",
    "DIRECCIÓN": "direccion",
    "DIRECCION": "direccion",
    "UBICACIÓN": "ubicacion",
    "UBICACION": "ubicacion",
    "RECOMENDACIONES": "recomendaciones",
    "ACTIVIDADES": "actividades",
    "SERVICIOS": "servicios",
}
_LONGITUDES = {"descripcion": 2500, "recomendaciones": 900}


def extraer_secciones(html: bytes, *, url: str = "") -> dict[str, str]:
    """Devuelve las secciones declaradas por la ficha, sin inventar datos."""

    documento = extraer_documento(url or "https://lapaz.bo/", html, None)
    secciones: dict[str, list[str]] = {}
    actual: str | None = None
    for linea in documento.texto.splitlines():
        clave = ETIQUETAS.get(linea.strip().upper())
        if clave:
            actual = clave
            secciones.setdefault(clave, [])
            continue
        if actual:
            secciones[actual].append(linea.strip())
    return {
        clave: " ".join(parte for parte in partes if parte)[
            : _LONGITUDES.get(clave, 300)
        ]
        for clave, partes in secciones.items()
    }


def valor_seccion(secciones: dict[str, str], clave: str) -> str:
    valor = re.sub(r"\s+", " ", secciones.get(clave, "")).strip()
    return valor or NO_VERIFICADO


def texto_para_rag(
    nombre: str,
    *,
    categoria: str,
    descripcion: str,
    horario: str,
    costo: str,
    direccion: str,
    url_fuente: str,
    url_coordenadas: str,
    latitud: float | None,
    longitud: float | None,
    imagen_atribucion: str,
) -> str:
    """Texto explícito y citado para los fragmentos del asistente."""

    coordenadas = (
        f"{latitud}, {longitud}"
        if latitud is not None and longitud is not None
        else NO_VERIFICADO
    )
    return "\n".join(
        (
            f"Destino: {nombre}.",
            f"Categoría: {categoria}.",
            f"Descripción declarada por la fuente: {descripcion or NO_VERIFICADO}.",
            f"Horario declarado por la fuente: {horario or NO_VERIFICADO}.",
            f"Costo declarado por la fuente: {costo or NO_VERIFICADO}.",
            f"Dirección declarada por la fuente: {direccion or NO_VERIFICADO}.",
            f"Coordenadas (según la URL de origen indicada): {coordenadas}.",
            f"Ficha de referencia: {url_fuente or NO_VERIFICADO}.",
            "Fuente de coordenadas: " f"{url_coordenadas or NO_VERIFICADO}.",
            f"Imagen y atribución: {imagen_atribucion or NO_VERIFICADO}.",
        )
    )
