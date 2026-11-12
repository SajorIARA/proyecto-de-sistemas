"""Compatibilidad: los ViewSets ahora viven en módulos por responsabilidad.

- :mod:`turismo.views_catalogo` — catálogo público (lectura).
- :mod:`turismo.views_admin` — CRUD admin.
- :mod:`turismo.views_medios` — firma, subida async y estado.

Este módulo re-exporta los nombres históricos; importar desde los
módulos nuevos en código nuevo.
"""

from .views_admin import AtractivoAdminViewSet, FotoAdminViewSet
from .views_catalogo import (
    AtractivoViewSet,
    CategoriaViewSet,
    HorarioViewSet,
    TarifaViewSet,
    TipoTarifaViewSet,
)
from .views_medios import (
    EXTENSIONES_IMAGEN,
    EXTENSIONES_VIDEO,
    FORMATOS_FOTO,
    MAX_BYTES_FOTO,
    EstadoFotoView,
    FirmaFotoView,
    SubirFotoView,
)

__all__ = [
    "AtractivoAdminViewSet",
    "AtractivoViewSet",
    "CategoriaViewSet",
    "EstadoFotoView",
    "EXTENSIONES_IMAGEN",
    "EXTENSIONES_VIDEO",
    "FirmaFotoView",
    "FORMATOS_FOTO",
    "FotoAdminViewSet",
    "HorarioViewSet",
    "MAX_BYTES_FOTO",
    "SubirFotoView",
    "TarifaViewSet",
    "TipoTarifaViewSet",
]
