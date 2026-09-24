from __future__ import annotations

from django.conf import settings
from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Límite estricto por IP para endpoints de autenticación
    (login/registro/refresh). Mitiga ataques de fuerza bruta
    complementando el throttle global ``anon``.

    Se desactiva con ``settings.DISABLE_AUTH_THROTTLE`` (activo solo
    al correr la suite de tests) para no volver flaky los tests.
    """

    scope = "auth"

    def allow_request(self, request, view) -> bool:
        if getattr(settings, "DISABLE_AUTH_THROTTLE", False):
            return True
        return super().allow_request(request, view)
