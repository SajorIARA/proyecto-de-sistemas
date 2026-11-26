from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AprobarCandidatoAdminView,
    CandidatosImportacionAdminView,
    ConsultaRAGView,
    FragmentoDocumentalViewSet,
    FuenteDocumentalViewSet,
    ImportacionAdminDetalleView,
    ImportacionesAdminView,
    RechazarCandidatoAdminView,
    VectorizarImportacionAdminView,
)

router = DefaultRouter()
router.register("fuentes", FuenteDocumentalViewSet, basename="fuente-documental")
router.register(
    "fragmentos", FragmentoDocumentalViewSet, basename="fragmento-documental"
)

app_name = "conocimiento"

urlpatterns = [
    path("consultar/", ConsultaRAGView.as_view(), name="consulta-rag"),
    # Panel admin de importaciones: siempre detrás de IsAdmin en la vista.
    path(
        "admin/importaciones/",
        ImportacionesAdminView.as_view(),
        name="importaciones-admin",
    ),
    path(
        "admin/importaciones/<uuid:id_importacion>/",
        ImportacionAdminDetalleView.as_view(),
        name="importacion-admin-detalle",
    ),
    path(
        "admin/importaciones/<uuid:id_importacion>/candidatos/",
        CandidatosImportacionAdminView.as_view(),
        name="candidatos-admin",
    ),
    path(
        "admin/importaciones/<uuid:id_importacion>/vectorizar/",
        VectorizarImportacionAdminView.as_view(),
        name="vectorizar-importacion-admin",
    ),
    path(
        "admin/candidatos/<uuid:id_candidato>/aprobar/",
        AprobarCandidatoAdminView.as_view(),
        name="aprobar-candidato-admin",
    ),
    path(
        "admin/candidatos/<uuid:id_candidato>/rechazar/",
        RechazarCandidatoAdminView.as_view(),
        name="rechazar-candidato-admin",
    ),
    *router.urls,
]
