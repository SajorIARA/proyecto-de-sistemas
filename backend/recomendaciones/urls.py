from rest_framework.routers import DefaultRouter

from .views import (
    ConsultaRecomendacionViewSet,
    MisPreferenciasViewSet,
    UsuarioPreferenciaViewSet,
)

router = DefaultRouter()
router.register(
    "preferencias", UsuarioPreferenciaViewSet, basename="usuario-preferencia"
)
router.register(
    "consultas", ConsultaRecomendacionViewSet, basename="consulta-recomendacion"
)

# Recurso propio del turista para el DoD del issue #22.
# Se monta en /api/preferences/ desde config/urls.py.
router_propio = DefaultRouter()
router_propio.register("", MisPreferenciasViewSet, basename="mis-preferencias")

app_name = "recomendaciones"

urlpatterns = router.urls
urlpatterns_propias = router_propio.urls
