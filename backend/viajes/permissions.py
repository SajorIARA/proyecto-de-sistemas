"""Reglas de aislamiento de los viajes.

Los viajes son datos personales: el filtro por usuario se aplica a todas las
consultas, sin excepción para quienes tienen rol ADMIN.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.db.models import QuerySet

if TYPE_CHECKING:  # pragma: no cover - solo tipado
    from usuarios.models import Usuario

    from .models import Viaje


def filtrar_viajes_propios(
    queryset: QuerySet[Viaje], usuario: Usuario
) -> QuerySet[Viaje]:
    """Devuelve solo los viajes del usuario autenticado.

    Se usa en ``get_queryset()`` de la vista. Incluso un ADMIN ve únicamente
    sus propios viajes: el criterio no depende del rol sino de la identidad.
    """

    return queryset.filter(usuario=usuario)
