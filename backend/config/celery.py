"""Integración Celery (issue #21): tareas en segundo plano con Redis."""

from __future__ import annotations

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self) -> str:
    """Tarea de prueba (DoD #21): debe ejecutarse y loguearse con éxito."""
    print(f"Tarea Celery OK (id={self.request.id})")
    return f"OK:{self.request.id}"
