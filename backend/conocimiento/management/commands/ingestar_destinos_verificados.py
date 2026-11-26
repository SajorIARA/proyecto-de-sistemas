from django.core.management.base import BaseCommand

from conocimiento.destinos_verificados import (
    DESTINOS_LA_PAZ,
    ingestar_destinos_verificados,
)


class Command(BaseCommand):
    help = "Ingiere destinos de La Paz con evidencia institucional y coordenadas verificadas."

    def handle(self, *args, **options):
        atractivos, fuentes = ingestar_destinos_verificados()
        self.stdout.write(
            self.style.SUCCESS(
                f"Procesados {len(DESTINOS_LA_PAZ)} destinos; "
                f"{atractivos} atractivos creados y {fuentes} fuentes actualizadas."
            )
        )
