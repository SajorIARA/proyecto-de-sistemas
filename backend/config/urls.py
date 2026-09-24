from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


def health(request):
    return JsonResponse(
        {
            "status": "ok",
            "service": "backend",
        }
    )


def root(request):
    return JsonResponse(
        {
            "service": "turismo-melgarejo-backend",
            "status": "ok",
            "endpoints": [
                "/api/health/",
                "/api/auth/",
                "/api/turismo/",
                "/api/conocimiento/",
                "/api/recomendaciones/",
                "/api/schema/",
                "/api/docs/",
                "/api/redoc/",
            ],
        }
    )


urlpatterns = [
    path("", root),
    path("api/", root),
    path("api/health/", health),
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
    path("api/auth/", include("usuarios.urls")),
    path("api/turismo/", include("turismo.urls")),
    path("api/conocimiento/", include("conocimiento.urls")),
    path("api/recomendaciones/", include("recomendaciones.urls")),
]
