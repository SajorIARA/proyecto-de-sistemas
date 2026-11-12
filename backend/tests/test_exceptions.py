from __future__ import annotations

from django.db.models import ProtectedError
from django.test import SimpleTestCase
from rest_framework import status

from config.exceptions import api_exception_handler


class ApiExceptionHandlerTests(SimpleTestCase):
    """ProtectedError debe tener prioridad sobre su clase base IntegrityError."""

    def test_protected_error_devuelve_mensaje_especifico(self) -> None:
        respuesta = api_exception_handler(ProtectedError("en uso", set()), {})

        self.assertIsNotNone(respuesta)
        self.assertEqual(respuesta.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            respuesta.data["detail"],
            "El registro está en uso y no puede eliminarse.",
        )
