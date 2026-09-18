from rest_framework.routers import DefaultRouter

from .views import (
    AtractivoViewSet,
    CategoriaViewSet,
    HorarioViewSet,
    TarifaViewSet,
    TipoTarifaViewSet,
)

router = DefaultRouter()
router.register("atractivos", AtractivoViewSet, basename="atractivo")
router.register("categorias", CategoriaViewSet, basename="categoria")
router.register("horarios", HorarioViewSet, basename="horario")
router.register("tarifas", TarifaViewSet, basename="tarifa")
router.register("tipos-tarifa", TipoTarifaViewSet, basename="tipo-tarifa")

app_name = "turismo"

urlpatterns = router.urls
