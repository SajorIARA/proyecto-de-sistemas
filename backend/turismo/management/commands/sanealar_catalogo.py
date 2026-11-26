"""Saneamiento editorial del catálogo: ruido, duplicados y duración faltante.

Por defecto es un *dry run*: solo informa. Con ``--apply`` ejecuta los cambios
de forma idempotente. Nunca inventa duraciones: los destinos activos que no
tienen ese dato se listan para revisión editorial.
"""

from __future__ import annotations

from contextlib import nullcontext

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q, QuerySet

from recomendaciones.models import UsuarioPreferencia
from turismo.models import Atractivo, AtractivoCategoria, Categoria


class Command(BaseCommand):
    help = (
        "Da de baja ruido sin señales, fusiona Mirador -> Miradores y reporta "
        "destinos activos sin duración. Dry-run por defecto; --apply aplica."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplica los cambios. Sin esta opción solo se informa.",
        )

    def handle(self, *args, **options) -> None:
        aplicar = bool(options["apply"])
        self.stdout.write(
            self.style.WARNING(
                "Modo: APLICANDO cambios." if aplicar else "Modo: DRY RUN (sin cambios)."
            )
        )

        # En --apply todo el saneamiento va en una sola transacción: si falla
        # una fusión, no queda una baja a medias.
        with transaction.atomic() if aplicar else nullcontext():
            bajas = self._bajar_ruido(aplicar)
            fusiones = self._fusionar_mirador(aplicar)
            sin_duracion = self._listar_sin_duracion()

        if bajas + fusiones == 0:
            self.stdout.write(self.style.SUCCESS("Sin cambios pendientes."))
        else:
            verbo = "aplicaron" if aplicar else "aplicarían"
            self.stdout.write(
                self.style.SUCCESS(
                    f"Resumen: {bajas + fusiones} cambio(s) que se {verbo}; "
                    f"{sin_duracion} destino(s) activo(s) requieren duración."
                )
            )

    @staticmethod
    def _candidatos_baja() -> QuerySet[Atractivo]:
        """Activos sin ninguna señal editorial: ni categoría activa, ni duración, ni URL."""
        return (
            Atractivo.objects.filter(activo=True, duracion_minutos__isnull=True)
            .filter(Q(url__isnull=True) | Q(url=""))
            .exclude(categorias__activo=True)
            .distinct()
            .order_by("nombre")
        )

    def _bajar_ruido(self, aplicar: bool) -> int:
        candidatos = list(self._candidatos_baja())
        for atractivo in candidatos:
            self.stdout.write(
                f"{'Dando de baja' if aplicar else 'Daría de baja'} "
                f"'{atractivo.nombre}': sin categoría activa, sin duración y sin URL."
            )
            if aplicar:
                Atractivo.objects.filter(pk=atractivo.pk).update(activo=False)
        return len(candidatos)

    def _fusionar_mirador(self, aplicar: bool) -> int:
        duplicada = Categoria.objects.filter(nombre="Mirador").first()
        canonica = Categoria.objects.filter(nombre="Miradores").first()
        if duplicada is None or canonica is None:
            self.stdout.write(
                "Fusión Mirador -> Miradores: omitida (falta alguna de las dos categorías)."
            )
            return 0

        cambios = 0

        # Se materializa la lista porque las filas se reasignan/borran durante
        # el recorrido. La restricción única (atractivo, categoría) se respeta:
        # si ya existe la relación canónica, se elimina la duplicada.
        relaciones = list(
            AtractivoCategoria.objects.filter(categoria=duplicada).select_related(
                "atractivo"
            )
        )
        for relacion in relaciones:
            nombre = relacion.atractivo.nombre
            ya_existe = AtractivoCategoria.objects.filter(
                atractivo_id=relacion.atractivo_id, categoria=canonica
            ).exists()
            if ya_existe:
                self.stdout.write(
                    f"{'Eliminando' if aplicar else 'Eliminaría'} relación duplicada "
                    f"Mirador -> Miradores en '{nombre}'."
                )
                if aplicar:
                    relacion.delete()
            else:
                self.stdout.write(
                    f"{'Reasignando' if aplicar else 'Reasignaría'} categoría de "
                    f"'{nombre}': Mirador -> Miradores."
                )
                if aplicar:
                    AtractivoCategoria.objects.filter(pk=relacion.pk).update(
                        categoria=canonica
                    )
            cambios += 1

        preferencias = list(
            UsuarioPreferencia.objects.filter(categoria=duplicada).select_related(
                "usuario"
            )
        )
        for preferencia in preferencias:
            correo = preferencia.usuario.email
            canonica_pref = UsuarioPreferencia.objects.filter(
                usuario_id=preferencia.usuario_id, categoria=canonica
            ).first()
            if canonica_pref is None:
                self.stdout.write(
                    f"{'Reasignando' if aplicar else 'Reasignaría'} preferencia de "
                    f"{correo}: Mirador -> Miradores."
                )
                if aplicar:
                    UsuarioPreferencia.objects.filter(pk=preferencia.pk).update(
                        categoria=canonica
                    )
            else:
                conservar = (
                    preferencia.nivel_interes > canonica_pref.nivel_interes
                )
                self.stdout.write(
                    f"{'Unificando' if aplicar else 'Unificaría'} preferencias de "
                    f"{correo} (nivel conservado: "
                    f"{max(preferencia.nivel_interes, canonica_pref.nivel_interes)})."
                )
                if aplicar:
                    if conservar:
                        UsuarioPreferencia.objects.filter(pk=canonica_pref.pk).update(
                            nivel_interes=preferencia.nivel_interes
                        )
                    preferencia.delete()
            cambios += 1

        if duplicada.activo:
            self.stdout.write(
                f"{'Dando de baja' if aplicar else 'Daría de baja'} la categoría "
                "duplicada 'Mirador' (la fila se conserva por integridad histórica)."
            )
            if aplicar:
                Categoria.objects.filter(pk=duplicada.pk).update(activo=False)
            cambios += 1

        return cambios

    def _listar_sin_duracion(self) -> int:
        # Se excluyen los que se dan de baja (o ya fueron dados de baja): el
        # reporte debe reflejar el estado final del catálogo.
        sin_duracion = (
            Atractivo.objects.filter(activo=True, duracion_minutos__isnull=True)
            .exclude(pk__in=self._candidatos_baja().values("pk"))
            .order_by("nombre")
        )
        resultados = list(sin_duracion)
        for atractivo in resultados:
            self.stdout.write(
                f"Duración faltante: '{atractivo.nombre}' "
                "(no se inventa este dato; requiere revisión editorial)."
            )
        return len(resultados)
