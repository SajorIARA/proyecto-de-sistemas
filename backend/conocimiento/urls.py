from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ConsultaRAGView,
    FragmentoDocumentalViewSet,
    FuenteDocumentalViewSet,
)

router = DefaultRouter()
router.register("fuentes", FuenteDocumentalViewSet, basename="fuente-documental")
router.register(
    "fragmentos", FragmentoDocumentalViewSet, basename="fragmento-documental"
)

app_name = "conocimiento"

urlpatterns = [
    path("consultar/", ConsultaRAGView.as_view(), name="consulta-rag"),
    *router.urls,
]
