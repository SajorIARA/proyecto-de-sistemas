"""Persistencia idempotente de los lugares descubiertos en fuentes abiertas."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.db import transaction

from .fuentes_abiertas import CandidatoLugar, buscar_lugares
from .models import ImportacionLugares, LugarCandidato


@dataclass(frozen=True)
class ResultadoImportacionLugares:
    id_importacion: UUID
    encontrados: int
    creados: int
    duplicados: int
    errores: dict[str, str]


def crear_importacion(
    consulta: str,
    *,
    ciudad: str = "La Paz",
    fuentes=("*",),
    limite: int = 20,
    id_importacion: UUID | str | None = None,
) -> ResultadoImportacionLugares:
    """Descubre lugares y guarda candidatos sin duplicar ``fuente+id_externo``.

    Una importación repetida actualiza los candidatos aún pendientes y deja
    intactos los ya aprobados o rechazados: la decisión de un administrador no
    debe ser sobrescrita por una nueva búsqueda automática.

    Si se pasa ``id_importacion``, se completa el registro que el endpoint ya
    devolvió como ``pendiente``; así la UI puede hacer polling desde el primer
    momento. Sin ese id se crea uno nuevo (comando de línea y tareas antiguas).
    """

    candidatos, errores = buscar_lugares(
        consulta, ciudad=ciudad, fuentes=fuentes, limite=limite
    )
    with transaction.atomic():
        if id_importacion is None:
            importacion = ImportacionLugares.objects.create(
                consulta=consulta,
                ciudad=ciudad,
                fuentes=list(fuentes),
                estado=ImportacionLugares.ESTADO_PENDIENTE,
                encontrados=len(candidatos),
            )
        else:
            importacion = ImportacionLugares.objects.filter(
                pk=id_importacion
            ).first()
            if importacion is None:
                raise ValueError("La importación indicada no existe.")
            importacion.consulta = consulta
            importacion.ciudad = ciudad
            importacion.fuentes = list(fuentes)
            importacion.encontrados = len(candidatos)
            importacion.error = ""
        creados = duplicados = 0
        for candidato in candidatos:
            datos = _valores_candidato(candidato, importacion)
            existente = LugarCandidato.objects.filter(
                fuente=candidato.fuente, id_externo=candidato.id_externo
            ).first()
            if existente is None:
                LugarCandidato.objects.create(**datos)
                creados += 1
                continue
            if existente.estado != LugarCandidato.ESTADO_PENDIENTE:
                duplicados += 1
                continue
            for campo, valor in datos.items():
                setattr(existente, campo, valor)
            existente.save()
            creados += 1

        importacion.candidatos_creados = creados
        importacion.duplicados = duplicados
        importacion.error = "; ".join(
            f"{fuente}: {mensaje}" for fuente, mensaje in sorted(errores.items())
        )[:2000]
        sin_fuentes = not candidatos and bool(errores)
        importacion.estado = (
            ImportacionLugares.ESTADO_ERROR
            if sin_fuentes
            else ImportacionLugares.ESTADO_COMPLETADO
        )
        importacion.save(
            update_fields=[
                "consulta",
                "ciudad",
                "fuentes",
                "encontrados",
                "candidatos_creados",
                "duplicados",
                "error",
                "estado",
                "fecha_actualizacion",
            ]
        )

    return ResultadoImportacionLugares(
        id_importacion=importacion.id_importacion,
        encontrados=len(candidatos),
        creados=creados,
        duplicados=duplicados,
        errores=errores,
    )


def _valores_candidato(
    candidato: CandidatoLugar, importacion: ImportacionLugares
) -> dict:
    return {
        "importacion": importacion,
        "fuente": candidato.fuente,
        "id_externo": candidato.id_externo,
        "hash_contenido": candidato.hash_contenido,
        "nombre": candidato.nombre,
        "descripcion": candidato.descripcion,
        "categoria_sugerida": candidato.categoria_sugerida,
        "latitud": candidato.latitud,
        "longitud": candidato.longitud,
        "direccion": candidato.direccion,
        "horario_declarado": candidato.horario_declarado,
        "sitio_web": candidato.sitio_web,
        "url_fuente": candidato.url_fuente,
        "licencia": candidato.licencia,
    }
