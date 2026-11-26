from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from conocimiento.carga_destinos import cargar_destinos
from conocimiento.models import FragmentoDocumental
from conocimiento.vectorization import vectorizar_fragmentos


class Command(BaseCommand):
    help = "Publica los 30 destinos solicitados y vectoriza sus fragmentos con Ollama."

    def add_arguments(self, parser):
        parser.add_argument("--sin-imagenes", action="store_true")
        parser.add_argument("--sin-vectorizar", action="store_true")

    def handle(self, *args, **options):
        resultado = cargar_destinos(con_imagenes=not options["sin_imagenes"])
        self.stdout.write(
            f"Destinos: {resultado.destinos} | creados: "
            f"{resultado.atractivos_creados} | fuentes: "
            f"{resultado.fuentes_actualizadas} | fotos nuevas: "
            f"{resultado.fotos_agregadas} | fragmentos: {resultado.fragmentos}"
        )
        for error in resultado.errores:
            self.stderr.write(f"Aviso: {error}")

        if options["sin_vectorizar"]:
            return
        try:
            vectorizacion = vectorizar_fragmentos(batch_size=16)
        except Exception as exc:
            raise CommandError(f"Vectorización fallida: {exc}") from exc
        pendientes = FragmentoDocumental.objects.filter(embedding__isnull=True).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Vectorizados {vectorizacion.vectorizados}/{vectorizacion.examinados} "
                f"con {vectorizacion.modelo}; sin embedding: {pendientes}."
            )
        )
        if pendientes:
            raise CommandError(f"Quedan {pendientes} fragmentos sin embedding.")
