from django.conf import settings
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@extend_schema(
    auth=[],
    responses={200: OpenApiTypes.OBJECT},
    description="Comprueba que el proceso backend está disponible.",
    tags=["sistema"],
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok", "service": "backend"})


def root(request):
    return JsonResponse(_root_payload())


def _root_payload() -> dict:
    endpoints = [
        "/api/health/",
        "/api/auth/",
        "/api/turismo/",
        "/api/conocimiento/",
        "/api/recomendaciones/",
        "/api/recommendations/",
        "/api/preferences/",
    ]
    if settings.SERVE_DOCS:
        endpoints += ["/api/schema/", "/api/docs/", "/api/redoc/"]
    return {
        "service": "turismo-melgarejo-backend",
        "status": "ok",
        "endpoints": endpoints,
    }


@extend_schema(
    auth=[],
    responses={200: OpenApiTypes.OBJECT},
    description="Índice de módulos y documentación de la API.",
    tags=["sistema"],
)
@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request):
    return Response(_root_payload())


urlpatterns = [
    path("", root),
    path("api/", api_root),
    path("api/health/", health),
    path("api/auth/", include("usuarios.urls")),
    path("api/turismo/", include("turismo.urls")),
    path("api/conocimiento/", include("conocimiento.urls")),
    path("api/recomendaciones/", include("recomendaciones.urls")),
    path("api/recommendations/", include("recomendaciones.urls_ingles")),
    path("api/preferences/", include("recomendaciones.urls_propias")),
]

if settings.SERVE_DOCS:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path(
            "api/docs/",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="swagger-ui",
        ),
        path(
            "api/redoc/",
            SpectacularRedocView.as_view(url_name="schema"),
            name="redoc",
        ),
    ]
