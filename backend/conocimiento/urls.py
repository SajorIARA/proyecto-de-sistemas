from rest_framework.routers import DefaultRouter

from .views import FragmentoDocumentalViewSet, FuenteDocumentalViewSet

router = DefaultRouter()
router.register("fuentes", FuenteDocumentalViewSet, basename="fuente-documental")
router.register(
    "fragmentos", FragmentoDocumentalViewSet, basename="fragmento-documental"
)

app_name = "conocimiento"

urlpatterns = router.urls
