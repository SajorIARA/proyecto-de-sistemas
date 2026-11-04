"""Alias en inglés del motor de recomendación (issue #27).

El DoD nombra ``/api/recommendations/``, mientras que el resto de la API
usa rutas en español. Se expone el mismo ``RecomendarView`` en ambas para
cumplir el contrato sin romper la convención existente.
"""

from django.urls import path

from .views import RecomendarView

app_name = "recommendations"

urlpatterns = [
    path("", RecomendarView.as_view(), name="recomendar"),
]
