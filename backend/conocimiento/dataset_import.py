"""Importación local e idempotente de datasets tabulares como conocimiento."""

from __future__ import annotations

import csv
import hashlib
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from django.db import transaction
from django.utils import timezone

from .models import FragmentoDocumental, FuenteDocumental

CSV_COLUMNS = (
    "Location",
    "Country",
    "Category",
    "Visitors",
    "Rating",
    "Revenue",
    "Accommodation_Available",
)


@dataclass(frozen=True)
class ResultadoImportacionDataset:
    id_fuente: UUID
    filas: int
    fragmentos: int
    actualizado: bool


def _leer_fragmentos(csv_path: Path) -> list[str]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as archivo:
        lector = csv.DictReader(archivo)
        encabezados = tuple(lector.fieldnames or ())
        faltantes = [columna for columna in CSV_COLUMNS if columna not in encabezados]
        if faltantes:
            raise ValueError(
                "El CSV no contiene las columnas requeridas: " + ", ".join(faltantes)
            )
        fragmentos = []
        for numero, fila in enumerate(lector, start=1):
            valores = {
                columna: (fila.get(columna) or "").strip() for columna in CSV_COLUMNS
            }
            if not any(valores.values()):
                continue
            fragmentos.append(
                "\n".join(
                    (
                        f"Registro turístico del dataset #{numero}.",
                        f"Ubicación declarada: {valores['Location']}.",
                        f"País: {valores['Country']}.",
                        f"Categoría: {valores['Category']}.",
                        f"Visitantes reportados: {valores['Visitors']}.",
                        f"Calificación: {valores['Rating']}.",
                        f"Ingresos reportados: {valores['Revenue']}.",
                        "Alojamiento disponible: "
                        f"{valores['Accommodation_Available']}.",
                    )
                )
            )
    if not fragmentos:
        raise ValueError("El CSV no contiene filas útiles.")
    return fragmentos


def importar_dataset_csv(
    csv_path: str | Path,
    *,
    url_fuente: str = "dataset://tourism_dataset.csv",
) -> ResultadoImportacionDataset:
    """Guarda cada fila del CSV como fragmento, sin crear atractivos geográficos."""

    ruta = Path(csv_path).expanduser()
    if not ruta.is_file():
        raise ValueError(f"No existe el archivo CSV: {ruta}")
    fragmentos = _leer_fragmentos(ruta)
    digest = hashlib.sha256("\n\n".join(fragmentos).encode("utf-8")).hexdigest()

    with transaction.atomic():
        fuente, _ = FuenteDocumental.objects.select_for_update().get_or_create(
            url=url_fuente,
            defaults={
                "titulo": "Tourism dataset CSV",
                "tipo": "dataset",
            },
        )
        sin_cambios = fuente.hash_contenido == digest and fuente.fragmentos.exists()
        fuente.titulo = "Tourism dataset CSV"
        fuente.tipo = "dataset"
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
                ],
                batch_size=500,
            )

    return ResultadoImportacionDataset(
        id_fuente=fuente.id_fuente,
        filas=len(fragmentos),
        fragmentos=len(fragmentos),
        actualizado=not sin_cambios,
    )
