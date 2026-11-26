"""Descubre lugares en fuentes abiertas y los deja listos para revisión admin."""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from conocimiento.fuentes_abiertas import FUENTES_DISPONIBLES, buscar_lugares
from conocimiento.importacion_lugares import crear_importacion


class Command(BaseCommand):
    help = (
        "Busca lugares con Overpass/Wikidata. Sin --apply solo muestra el "
        "dry-run; con --apply guarda importación y candidatos pendientes."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument("--consulta", required=True, help="Texto a buscar.")
        parser.add_argument("--ciudad", default="La Paz")
        parser.add_argument("--limite", type=int, default=20)
        parser.add_argument(
            "--fuentes",
            default=",".join(FUENTES_DISPONIBLES),
            help="Lista separada por comas: overpass,wikidata.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persiste la importación. Por defecto la ejecución es solo lectura.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Explícitamente no escribe en la base (comportamiento por defecto).",
        )

    def handle(self, *args, **options) -> None:
        fuentes = tuple(
            fuente.strip()
            for fuente in options["fuentes"].split(",")
            if fuente.strip()
        )
        desconocidas = [f for f in fuentes if f not in FUENTES_DISPONIBLES]
        if desconocidas:
            raise CommandError(
                "Fuentes no soportadas: " + ", ".join(desconocidas)
            )
        limite = options["limite"]
        if not 1 <= limite <= settings.FUENTES_ABIERTAS_MAX_LIMITE:
            raise CommandError(
                f"--limite debe estar entre 1 y {settings.FUENTES_ABIERTAS_MAX_LIMITE}."
            )

        if not options["apply"]:
            candidatos, errores = buscar_lugares(
                options["consulta"],
                ciudad=options["ciudad"],
                fuentes=fuentes,
                limite=limite,
            )
            for candidato in candidatos:
                self.stdout.write(
                    f"{candidato.fuente}: {candidato.nombre} "
                    f"({candidato.latitud}, {candidato.longitud}) "
                    f"→ {candidato.url_fuente}"
                )
            for fuente, mensaje in errores.items():
                self.stderr.write(f"Error en {fuente}: {mensaje}")
            self.stdout.write(
                self.style.WARNING(
                    f"Dry-run: {len(candidatos)} candidatos. No se escribió en la BD."
                )
            )
            return

        resultado = crear_importacion(
            options["consulta"],
            ciudad=options["ciudad"],
            fuentes=fuentes,
            limite=limite,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Importación {resultado.id_importacion}: "
                f"{resultado.encontrados} encontrados, "
                f"{resultado.creados} creados, "
                f"{resultado.duplicados} duplicados."
            )
        )
        for fuente, mensaje in resultado.errores.items():
            self.stderr.write(f"Error parcial en {fuente}: {mensaje}")
