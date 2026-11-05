from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ConsultaRecomendacionViewSet,
    RecomendarView,
    UsuarioPreferenciaViewSet,
)

router = DefaultRouter()
router.register(
    "preferencias", UsuarioPreferenciaViewSet, basename="usuario-preferencia"
)
router.register(
    "consultas", ConsultaRecomendacionViewSet, basename="consulta-recomendacion"
)

app_name = "recomendaciones"

urlpatterns = [
    path("recomendar/", RecomendarView.as_view(), name="recomendar"),
    *router.urls,
]
