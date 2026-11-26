from django.apps import AppConfig


class ViajesConfig(AppConfig):
    """Configuración de la app de viajes personales de los turistas."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "viajes"
    verbose_name = "Viajes"
