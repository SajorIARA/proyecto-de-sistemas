"""Vectorización idempotente de fragmentos documentales con Ollama."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import FragmentoDocumental
from .ollama import ClienteOllama


@dataclass(frozen=True)
class ResultadoVectorizacion:
    examinados: int
    vectorizados: int
    modelo: str
    dimension: int


def vectorizar_fragmentos(
    *,
    id_fuente: str | UUID | None = None,
    batch_size: int = 16,
    forzar: bool = False,
    cliente: ClienteOllama | None = None,
) -> ResultadoVectorizacion:
    if not 1 <= batch_size <= 128:
        raise ValueError("batch_size debe estar entre 1 y 128.")
    consulta = FragmentoDocumental.objects.select_related("fuente").order_by(
        "id_fragmento"
    )
    if id_fuente:
        consulta = consulta.filter(fuente_id=id_fuente)
    if not forzar:
        consulta = consulta.filter(
            Q(embedding__isnull=True)
            | ~Q(embedding_modelo=settings.OLLAMA_EMBED_MODEL)
            | ~Q(embedding_dimension=settings.EMBEDDING_DIM)
        )
    ids = list(consulta.values_list("id_fragmento", flat=True))
    servicio = cliente or ClienteOllama()
    vectorizados = 0
    for inicio in range(0, len(ids), batch_size):
        lote = list(
            FragmentoDocumental.objects.select_related("fuente")
            .filter(id_fragmento__in=ids[inicio : inicio + batch_size])
            .order_by("id_fragmento")
        )
        entradas = [
            f"title: {item.fuente.titulo} | text: {item.contenido}" for item in lote
        ]
        vectores = servicio.embeddings(entradas)
        ahora = timezone.now()
        for item, vector in zip(lote, vectores, strict=True):
            item.embedding = vector
            item.embedding_modelo = settings.OLLAMA_EMBED_MODEL
            item.embedding_dimension = settings.EMBEDDING_DIM
            item.embedding_actualizado = ahora
        FragmentoDocumental.objects.bulk_update(
            lote,
            [
                "embedding",
                "embedding_modelo",
                "embedding_dimension",
                "embedding_actualizado",
            ],
        )
        vectorizados += len(lote)
    return ResultadoVectorizacion(
        examinados=len(ids),
        vectorizados=vectorizados,
        modelo=settings.OLLAMA_EMBED_MODEL,
        dimension=settings.EMBEDDING_DIM,
    )
