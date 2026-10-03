from __future__ import annotations

from django.test import TestCase, override_settings

from config.celery import app, debug_task


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class CeleryTaskTests(TestCase):
    """Issue #21: broker + tarea de prueba (ejecución eager en tests)."""

    def test_debug_task_ejecuta_y_retorna_ok(self) -> None:
        resultado = debug_task.delay()
        self.assertTrue(str(resultado.get()).startswith("OK:"))

    def test_celery_usa_redis_como_broker(self) -> None:
        self.assertTrue(app.conf.broker_url.startswith("redis://"))
