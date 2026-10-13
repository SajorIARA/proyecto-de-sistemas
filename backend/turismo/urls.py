from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AtractivoAdminViewSet,
    AtractivoViewSet,
    CategoriaViewSet,
    EstadoFotoView,
    FirmaFotoView,
    FotoAdminViewSet,
    HorarioViewSet,
    SubirFotoView,
    TarifaViewSet,
    TipoTarifaViewSet,
)

router = DefaultRouter()
router.register("atractivos", AtractivoViewSet, basename="atractivo")
router.register("admin/atractivos", AtractivoAdminViewSet, basename="atractivo-admin")
router.register("admin/fotos", FotoAdminViewSet, basename="foto-admin")
router.register("categorias", CategoriaViewSet, basename="categoria")
router.register("horarios", HorarioViewSet, basename="horario")
router.register("tarifas", TarifaViewSet, basename="tarifa")
router.register("tipos-tarifa", TipoTarifaViewSet, basename="tipo-tarifa")

app_name = "turismo"

# La firma va ANTES que el router: si no, `admin/fotos/{pk}/` del
# ViewSet capturaría "firma" como lookup.
urlpatterns = [
    path(
        "admin/fotos/firma/",
        FirmaFotoView.as_view(),
        name="foto-firma",
    ),
    path(
        "admin/fotos/subir/",
        SubirFotoView.as_view(),
        name="foto-subir",
    ),
    path(
        "admin/fotos/<int:pk>/estado/",
        EstadoFotoView.as_view(),
        name="foto-estado",
    ),
] + router.urls
