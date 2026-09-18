from django.http import JsonResponse
from django.urls import include, path

from rest_framework.routers import DefaultRouter

router = DefaultRouter()


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
            ],
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
]
