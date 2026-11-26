"""Rutas del módulo de viajes.

El prefijo ``api/viajes/`` lo añade ``config.urls`` al incluir este módulo,
por eso el router se registra con prefijo vacío. Se desactiva la raíz del
``DefaultRouter`` para que ``GET /api/viajes/`` resuelva al listado.
"""

from rest_framework.routers import DefaultRouter

from .views import ViajeViewSet

router = DefaultRouter()
# Con prefijo vacío, la raíz del router compartiría URL con el listado.
router.include_root_view = False
router.register("", ViajeViewSet, basename="viaje")

app_name = "viajes"

urlpatterns = [*router.urls]
