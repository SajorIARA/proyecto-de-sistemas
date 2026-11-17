from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from conocimiento.vectorization import vectorizar_fragmentos


class Command(BaseCommand):
    help = "Genera embeddings Ollama para fragmentos pendientes o desactualizados."

    def add_arguments(self, parser):
        parser.add_argument("--fuente", help="UUID de una fuente documental.")
        parser.add_argument("--batch-size", type=int, default=16)
        parser.add_argument("--force", action="store_true")

    def handle(self, *args, **options):
        try:
            resultado = vectorizar_fragmentos(
                id_fuente=options["fuente"],
                batch_size=options["batch_size"],
                forzar=options["force"],
            )
        except Exception as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(
            self.style.SUCCESS(
                f"Vectorizados {resultado.vectorizados}/{resultado.examinados} "
                f"fragmentos con {resultado.modelo} ({resultado.dimension}d)."
            )
        )
