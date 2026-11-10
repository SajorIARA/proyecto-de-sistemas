"""Rutas propias del turista (issue #22).

Se montan en /api/preferences/ mediante include() por string en
config/urls.py, para no crear imports directos que arrastren módulos
al análisis de mypy (backend/config).
"""

from rest_framework.routers import DefaultRouter

from .views import MisPreferenciasViewSet

router_propio = DefaultRouter()
router_propio.register("", MisPreferenciasViewSet, basename="mis-preferencias")

app_name = "preferencias"

urlpatterns = router_propio.urls
