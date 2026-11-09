from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from conocimiento.services import ingerir_url
from conocimiento.tasks import scrapear_fuente_task


class Command(BaseCommand):
    help = "Descarga e ingiere URLs permitidas como conocimiento para RAG."

    def add_arguments(self, parser):
        parser.add_argument("--url", action="append", required=True)
        parser.add_argument("--atractivo", help="UUID del atractivo relacionado.")
        parser.add_argument(
            "--allow-domain",
            action="append",
            default=[],
            help="Dominio explícito adicional (útil en ejecución manual).",
        )
        parser.add_argument(
            "--enqueue",
            action="store_true",
            help="Encola en Celery; requiere SCRAPER_ALLOWED_DOMAINS configurado.",
        )

    def handle(self, *args, **options):
        dominios = tuple(settings.SCRAPER_ALLOWED_DOMAINS) + tuple(
            options["allow_domain"]
        )
        if options["enqueue"] and options["allow_domain"]:
            raise CommandError(
                "--allow-domain no se combina con --enqueue; configura "
                "SCRAPER_ALLOWED_DOMAINS para que el worker use la misma política."
            )
        if not dominios:
            raise CommandError(
                "No hay dominios permitidos. Define SCRAPER_ALLOWED_DOMAINS o usa "
                "--allow-domain en modo síncrono."
            )
        errores = 0
        for url in options["url"]:
            try:
                if options["enqueue"]:
                    tarea = scrapear_fuente_task.delay(url, options["atractivo"])
                    self.stdout.write(f"Encolada {url}: {tarea.id}")
                    continue
                resultado = ingerir_url(
                    url,
                    id_atractivo=options["atractivo"],
                    dominios_permitidos=dominios,
                )
                estado = "actualizada" if resultado.actualizado else "sin cambios"
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{resultado.url}: {resultado.fragmentos} fragmentos ({estado})"
                    )
                )
            except Exception as exc:
                errores += 1
                self.stderr.write(self.style.ERROR(f"{url}: {exc}"))
        if errores:
            raise CommandError(f"Fallaron {errores} de {len(options['url'])} URLs.")
