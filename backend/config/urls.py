from django.http import JsonResponse
from django.urls import path


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
            "endpoints": ["/api/health/"],
        }
    )


urlpatterns = [
    path("", root),
    path("api/", root),
    path("api/health/", health),
]
