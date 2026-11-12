"""FilterSets declarativos del catálogo (issue #18).

Sustituyen el filtrado manual en ``get_queryset`` (KISS/DRY): cada filtro
es un método nombrado y testeable, y drf-spectacular documenta los
parámetros automáticamente desde el FilterSet.
"""

from __future__ import annotations

import django_filters as filters
from django.db.models import Q
from django_filters.constants import EMPTY_VALUES

from .models import Atractivo


class CategoriaOrFilter(filters.CharFilter):
    """Categoría por nombre o id, repetible o coma-separada, con OR.

    ``?categoria=Cultura&categoria=3`` y ``?categoria=Cultura,3`` son
    equivalentes: django-filter solo entrega el último valor repetido a
    ``filter()``, así que se releen todos desde los datos crudos.
    """

    def filter(self, qs, value):
        if value in EMPTY_VALUES:
            return qs
        datos = getattr(self.parent, "data", None)
        getlist = getattr(datos, "getlist", None)
        crudos = getlist("categoria") if getlist else [value]
        valores = [c.strip() for v in crudos for c in str(v).split(",") if c.strip()]
        por_id = [c for c in valores if c.isdigit()]
        por_nombre = [c for c in valores if not c.isdigit()]
        filtro = Q()
        if por_id:
            filtro |= Q(categorias__id_categoria__in=por_id)
        if por_nombre:
            filtro |= Q(categorias__nombre__in=por_nombre)
        return qs.filter(filtro)


class AtractivoFilter(filters.FilterSet):
    """Filtros combinables del catálogo público.

    ``q`` (nombre/descripción/dirección), ``categoria`` (nombre o id,
    repetible o coma-separado), ``zona`` (texto en dirección),
    ``precio_min``/``precio_max`` (BOB, sobre tarifas). Ej:
    ``/api/turismo/atractivos/?q=museo&categoria=Cultura&precio_max=50``.
    """

    q = filters.CharFilter(method="filtrar_q")
    categoria = CategoriaOrFilter()
    zona = filters.CharFilter(field_name="direccion", lookup_expr="icontains")
    precio_min = filters.NumberFilter(method="filtrar_precio")
    precio_max = filters.NumberFilter(method="filtrar_precio")

    class Meta:
        model = Atractivo
        fields: list[str] = []

    def filtrar_precio(self, queryset, _nombre, _valor):
        """Aplica ambos límites sobre una **misma** tarifa.

        django-filter invoca el método una vez por cada parámetro presente.
        Si cada límite se aplicara por separado, Django crearía un join de
        ``tarifas`` por límite y un destino con tarifas de 10 y 100 pasaría
        ``precio_min=50&precio_max=50`` (una tarifa cumple el mínimo y otra
        el máximo). El guard hace que solo la primera invocación construya
        el filtro combinado.
        """
        if getattr(self, "_precio_aplicado", False):
            return queryset
        self._precio_aplicado = True

        minimo = self.form.cleaned_data.get("precio_min")
        maximo = self.form.cleaned_data.get("precio_max")

        rango = {}
        if minimo is not None:
            rango["tarifas__monto__gte"] = minimo
        if maximo is not None:
            rango["tarifas__monto__lte"] = maximo

        if not rango:
            return queryset

        # distinct(): un destino con varias tarifas dentro del rango no debe
        # repetirse en el catálogo.
        return queryset.filter(**rango).distinct()

    def filtrar_q(self, queryset, _nombre, valor: str):
        return queryset.filter(
            Q(nombre__icontains=valor)
            | Q(descripcion__icontains=valor)
            | Q(direccion__icontains=valor)
        )
