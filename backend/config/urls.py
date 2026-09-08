from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from turismo.views import AtractivoViewSet

router = DefaultRouter()
router.register("atractivos", AtractivoViewSet, basename="atractivo")


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
            "endpoints": ["/api/health/", "/api/atractivos/"],
        }
    )


urlpatterns = [
    path("", root),
    path("api/", root),
    path("api/health/", health),
    path("api/", include(router.urls)),
]
from django.urls import URLPattern


urlpatterns: list[URLPattern] = []
