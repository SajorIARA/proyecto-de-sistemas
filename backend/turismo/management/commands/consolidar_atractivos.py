from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from turismo.models import Atractivo

FUSIONES = {
    "Basílica de San Francisco": "Basílica Menor de San Francisco",
    "Valle de la Luna": "Valle de la Luna",
}


class Command(BaseCommand):
    help = "Consolida duplicados conservando el registro con URL y procedencia verificadas."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Aplica los cambios.")

    def handle(self, *args, **options):
        for duplicado_nombre, canonico_nombre in FUSIONES.items():
            candidatos = list(Atractivo.objects.filter(nombre=duplicado_nombre).order_by("url"))
            if duplicado_nombre == canonico_nombre:
                candidatos = [item for item in candidatos if not item.url]
            canonico = Atractivo.objects.filter(
                nombre=canonico_nombre, url__isnull=False
            ).first()
            if canonico is None:
                raise CommandError(f"No existe canónico verificable: {canonico_nombre}")
            for duplicado in candidatos:
                if duplicado.pk == canonico.pk:
                    continue
                if not options["apply"]:
                    self.stdout.write(f"Fusionar {duplicado.nombre} -> {canonico.nombre}")
                    continue
                with transaction.atomic():
                    canonico.categorias.add(*duplicado.categorias.all())
                    duplicado.fuentes.update(atractivo=canonico)
                    duplicado.fotos.update(atractivo=canonico)
                    duplicado.delete()
                self.stdout.write(self.style.SUCCESS(f"Fusionado: {duplicado_nombre}"))
