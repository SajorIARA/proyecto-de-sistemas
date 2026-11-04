"""Servicio de recomendación multicriterio (issue #27).

Integra el motor puro de :mod:`recomendaciones.scoring` con la base de
datos. Los filtros duros se resuelven en PostGIS/ORM antes de puntuar:

- ``costo_bob <= presupuesto_bob`` usando la tarifa mínima vigente en BOB
  (los atractivos sin tarifa se consideran gratuitos).
- ``ST_DistanceSphere(ubicacion, punto_partida) <= radio_km``, de modo
  que la distancia se calcula en la base de datos y no en Python.

El tiempo disponible no es un filtro duro: el motor de la issue #26
penaliza los destinos que exceden la ventana del turista. El resultado se
ordena de forma determinista por puntaje, distancia e identificador.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Mapping

from django.contrib.gis.db.models import PointField
from django.contrib.gis.geos import Point
from django.db.models import (
    DecimalField,
    F,
    FloatField,
    Func,
    Min,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
    Value,
)
from django.db.models.functions import Coalesce
from django.utils import timezone

from turismo.models import Atractivo, Categoria, Tarifa

from .scoring import (
    AtractivoCandidato,
    ConfiguracionPonderacion,
    PerfilTuristico,
    Puntuacion,
    Puntuador,
)

RADIO_KM_POR_DEFECTO = ConfiguracionPonderacion().radio_km
TOP_K_POR_DEFECTO = 10
TOP_K_MAXIMO = 50
# Sin duración declarada no se asume un destino instantáneo: se usa una
# visita estándar de dos horas para no inflar artificialmente su puntaje.
DURACION_PREDETERMINADA_MINUTOS = 120

_CAMPO_DECIMAL = DecimalField(max_digits=10, decimal_places=2)


class DistanciaEsferica(Func):
    """``ST_DistanceSphere`` de PostGIS expresado como función de Django."""

    function = "ST_DistanceSphere"
    output_field = FloatField()
    arity = 2


def tarifa_minima_bob() -> Subquery:
    """Subconsulta con la tarifa BOB vigente más barata por atractivo."""

    hoy = timezone.localdate()
    return Subquery(
        Tarifa.objects.filter(
            atractivo=OuterRef("pk"),
            moneda="BOB",
        )
        .filter(Q(vigente_desde__isnull=True) | Q(vigente_desde__lte=hoy))
        .filter(Q(vigente_hasta__isnull=True) | Q(vigente_hasta__gte=hoy))
        .order_by()
        .values("atractivo")
        .annotate(minimo=Min("monto"))
        .values("minimo")[:1],
        output_field=_CAMPO_DECIMAL,
    )


def candidatos_cercanos(
    *,
    punto_partida: Point,
    presupuesto_bob: Decimal,
    radio_km: float,
) -> list[Atractivo]:
    """Atractivos activos que cumplen los filtros duros, con anotaciones.

    Cada resultado trae ``costo_bob`` (tarifa mínima BOB o cero) y
    ``distancia_m`` calculada por PostGIS con ``ST_DistanceSphere``.
    """

    punto = Value(punto_partida, output_field=PointField())
    return list(
        Atractivo.objects.filter(activo=True)
        .prefetch_related(
            Prefetch(
                "categorias",
                queryset=Categoria.objects.filter(activo=True),
            )
        )
        .annotate(
            costo_bob=Coalesce(
                tarifa_minima_bob(),
                Value(Decimal("0.00")),
                output_field=_CAMPO_DECIMAL,
            ),
            distancia_m=DistanciaEsferica(F("ubicacion"), punto),
        )
        .filter(
            costo_bob__lte=presupuesto_bob,
            distancia_m__lte=radio_km * 1000,
        )
        .order_by("distancia_m", "id_atractivo")
    )


@dataclass(frozen=True)
class _MetadatosAtractivo:
    """Datos del atractivo que no forman parte del cálculo del puntaje."""

    categorias: tuple[str, ...]
    costo_bob: Decimal
    duracion_horas: Decimal
    latitud: float
    longitud: float


@dataclass(frozen=True)
class Recomendacion:
    """Puntuación enriquecida con los datos mostrables del atractivo."""

    puntuacion: Puntuacion
    categorias: tuple[str, ...]
    costo_bob: Decimal
    duracion_horas: Decimal
    latitud: float
    longitud: float


@dataclass(frozen=True)
class ResultadoRecomendacion:
    """Top-K determinista y métricas del proceso de filtrado."""

    recomendaciones: tuple[Recomendacion, ...]
    total_evaluados: int
    total_activos: int
    radio_km: float
    top_k: int


def recomendar(
    *,
    presupuesto_bob: Decimal,
    tiempo_horas: Decimal,
    punto_partida: Point,
    radio_km: float = RADIO_KM_POR_DEFECTO,
    top_k: int = TOP_K_POR_DEFECTO,
    preferencias: Mapping[str, Decimal] | None = None,
) -> ResultadoRecomendacion:
    """Calcula el ranking Top-K de destinos viables para un perfil.

    ``preferencias`` asocia nombre de categoría con nivel de interés en
    ``[0, 1]``. Si es ``None``, la afinidad de categoría es cero; la capa
    HTTP la completa con las preferencias persistidas del turista.
    """

    if radio_km <= 0:
        raise ValueError("radio_km debe ser mayor a 0.")
    if top_k <= 0 or top_k > TOP_K_MAXIMO:
        raise ValueError(f"top_k debe estar entre 1 y {TOP_K_MAXIMO}.")

    configuracion = ConfiguracionPonderacion(radio_km=radio_km)
    perfil = PerfilTuristico(
        presupuesto_bob=presupuesto_bob,
        tiempo_horas=tiempo_horas,
        latitud=punto_partida.y,
        longitud=punto_partida.x,
        preferencias=preferencias or {},
    )

    atractivos = candidatos_cercanos(
        punto_partida=punto_partida,
        presupuesto_bob=presupuesto_bob,
        radio_km=radio_km,
    )
    candidatos: list[AtractivoCandidato] = []
    metadatos: dict[str, _MetadatosAtractivo] = {}

    for atractivo in atractivos:
        categorias = tuple(
            sorted(
                categoria.nombre
                for categoria in atractivo.categorias.all()
                if categoria.activo
            )
        )
        minutos = atractivo.duracion_minutos or DURACION_PREDETERMINADA_MINUTOS
        duracion_horas = Decimal(minutos) / Decimal("60")
        distancia_km = float(atractivo.distancia_m) / 1000
        costo_bob: Decimal = atractivo.costo_bob
        candidato = AtractivoCandidato(
            id_atractivo=str(atractivo.id_atractivo),
            nombre=atractivo.nombre,
            categorias=frozenset(categorias),
            costo_bob=costo_bob,
            duracion_horas=duracion_horas,
            latitud=atractivo.ubicacion.y,
            longitud=atractivo.ubicacion.x,
            distancia_km=distancia_km,
        )
        candidatos.append(candidato)
        metadatos[candidato.id_atractivo] = _MetadatosAtractivo(
            categorias=categorias,
            costo_bob=costo_bob,
            duracion_horas=duracion_horas,
            latitud=candidato.latitud,
            longitud=candidato.longitud,
        )

    ranking = Puntuador(configuracion).rankear(perfil, candidatos, top_k=top_k)
    recomendaciones = tuple(
        Recomendacion(
            puntuacion=puntuacion,
            categorias=metadatos[puntuacion.id_atractivo].categorias,
            costo_bob=metadatos[puntuacion.id_atractivo].costo_bob,
            duracion_horas=metadatos[puntuacion.id_atractivo].duracion_horas,
            latitud=metadatos[puntuacion.id_atractivo].latitud,
            longitud=metadatos[puntuacion.id_atractivo].longitud,
        )
        for puntuacion in ranking
    )
    return ResultadoRecomendacion(
        recomendaciones=recomendaciones,
        total_evaluados=len(candidatos),
        total_activos=Atractivo.objects.filter(activo=True).count(),
        radio_km=radio_km,
        top_k=top_k,
    )
