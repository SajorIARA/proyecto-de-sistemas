from django.conf import settings
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from recomendaciones.urls import urlpatterns_propias as preferences_urls


def health(request):
    return JsonResponse(
        {
            "status": "ok",
            "service": "backend",
        }
    )


def root(request):
    endpoints = [
        "/api/health/",
        "/api/auth/",
        "/api/turismo/",
        "/api/conocimiento/",
        "/api/recomendaciones/",
        "/api/preferences/",
    ]
    if settings.SERVE_DOCS:
        endpoints += ["/api/schema/", "/api/docs/", "/api/redoc/"]
    return JsonResponse(
        {
            "service": "turismo-melgarejo-backend",
            "status": "ok",
            "endpoints": endpoints,
        }
    )


urlpatterns = [
    path("", root),
    path("api/", root),
    path("api/health/", health),
    path("api/auth/", include("usuarios.urls")),
    path("api/turismo/", include("turismo.urls")),
    path("api/conocimiento/", include("conocimiento.urls")),
    path("api/recomendaciones/", include("recomendaciones.urls")),
    path(
        "api/preferences/",
        include((preferences_urls, "preferencias")),
    ),
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
