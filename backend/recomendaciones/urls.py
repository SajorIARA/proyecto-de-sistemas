from rest_framework.routers import DefaultRouter

from .views import ConsultaRecomendacionViewSet, UsuarioPreferenciaViewSet

router = DefaultRouter()
router.register(
    "preferencias", UsuarioPreferenciaViewSet, basename="usuario-preferencia"
)
router.register(
    "consultas", ConsultaRecomendacionViewSet, basename="consulta-recomendacion"
)

app_name = "recomendaciones"

urlpatterns = router.urls
