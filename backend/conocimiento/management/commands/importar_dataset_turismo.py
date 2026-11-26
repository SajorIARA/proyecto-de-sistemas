from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from conocimiento.dataset_import import importar_dataset_csv


class Command(BaseCommand):
    help = (
        "Importa un CSV turístico como conocimiento vectorizable, "
        "sin crear atractivos ni coordenadas."
    )

    def add_arguments(self, parser):
        parser.add_argument("--csv", required=True, help="Ruta local al archivo CSV.")
        parser.add_argument(
            "--source-url",
            default="dataset://tourism_dataset.csv",
            help="Identificador estable de la fuente para reejecuciones idempotentes.",
        )

    def handle(self, *args, **options):
        try:
            resultado = importar_dataset_csv(
                options["csv"], url_fuente=options["source_url"]
            )
        except (OSError, ValueError) as exc:
            raise CommandError(str(exc)) from exc
        estado = "actualizada" if resultado.actualizado else "sin cambios"
        self.stdout.write(
            self.style.SUCCESS(
                f"Dataset: {resultado.filas} filas y {resultado.fragmentos} "
                f"fragmentos ({estado}). Fuente: {resultado.id_fuente}"
            )
        )
