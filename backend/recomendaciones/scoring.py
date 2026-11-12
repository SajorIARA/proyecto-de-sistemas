"""Motor de puntuación ponderada para recomendar atractivos turísticos.

Issue #26: formaliza la matriz de ponderación que combina afinidad de
categorías, proximidad geográfica (distancia esférica), holgura de
presupuesto (BOB) y holgura de tiempo disponible. Los destinos que
exceden el presupuesto o el tiempo reciben penalizaciones configurables
y, opcionalmente, pueden excluirse con filtros estrictos.

La fórmula es deliberadamente independiente de Django y de PostGIS para
poder validarla con perfiles simulados sin base de datos::

    puntaje_base = w_categoria * afinidad
                 + w_distancia * proximidad
                 + w_presupuesto * holgura_presupuesto
                 + w_tiempo * holgura_tiempo

    factor_penalizacion = producto de los factores de las restricciones
                          incumplidas (1.0 si no hay incumplimientos)

    puntaje = puntaje_base * factor_penalizacion

Los pesos deben sumar 1.0, por lo que ``puntaje_base`` y ``puntaje``
quedan en el rango [0, 1].
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from math import asin, cos, radians, sin, sqrt
from typing import Iterable, Mapping, Sequence

RADIO_TIERRA_KM = 6371.0088


def distancia_haversine_km(
    latitud_origen: float,
    longitud_origen: float,
    latitud_destino: float,
    longitud_destino: float,
) -> float:
    """Distancia esférica entre dos puntos (lat, lon) en kilómetros."""

    lat1, lon1, lat2, lon2 = map(
        radians, (latitud_origen, longitud_origen, latitud_destino, longitud_destino)
    )
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * RADIO_TIERRA_KM * asin(sqrt(a))


def _normalizar_categoria(categoria: str) -> str:
    return categoria.strip().casefold()


def _acotar(valor: float, minimo: float = 0.0, maximo: float = 1.0) -> float:
    return max(minimo, min(maximo, valor))


@dataclass(frozen=True)
class ConfiguracionPonderacion:
    """Pesos y penalizaciones configurables del motor (issue #26)."""

    peso_categoria: float = 0.40
    peso_distancia: float = 0.25
    peso_presupuesto: float = 0.20
    peso_tiempo: float = 0.15
    radio_km: float = 15.0
    factor_fuera_presupuesto: float = 0.30
    factor_fuera_tiempo: float = 0.30
    filtros_estrictos: bool = False

    def __post_init__(self) -> None:
        pesos = (
            self.peso_categoria,
            self.peso_distancia,
            self.peso_presupuesto,
            self.peso_tiempo,
        )
        if any(peso < 0 for peso in pesos):
            raise ValueError("Los pesos de la matriz no pueden ser negativos.")
        if abs(sum(pesos) - 1.0) > 1e-6:
            raise ValueError("Los pesos de la matriz deben sumar 1.0.")
        if self.radio_km <= 0:
            raise ValueError("radio_km debe ser mayor a 0.")
        for nombre, factor in (
            ("factor_fuera_presupuesto", self.factor_fuera_presupuesto),
            ("factor_fuera_tiempo", self.factor_fuera_tiempo),
        ):
            if not 0.0 <= factor <= 1.0:
                raise ValueError(f"{nombre} debe estar entre 0.0 y 1.0.")

    @property
    def matriz(self) -> dict[str, float]:
        """Pesos expuestos como matriz para documentación y trazabilidad."""

        return {
            "categoria": self.peso_categoria,
            "distancia": self.peso_distancia,
            "presupuesto": self.peso_presupuesto,
            "tiempo": self.peso_tiempo,
        }


@dataclass(frozen=True)
class PerfilTuristico:
    """Restricciones y preferencias de un turista simulado."""

    presupuesto_bob: Decimal
    tiempo_horas: Decimal
    latitud: float
    longitud: float
    preferencias: Mapping[str, Decimal] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.presupuesto_bob < 0:
            raise ValueError("presupuesto_bob no puede ser negativo.")
        if self.tiempo_horas <= 0:
            raise ValueError("tiempo_horas debe ser mayor a 0.")
        for categoria, nivel in self.preferencias.items():
            if not 0 <= nivel <= 1:
                raise ValueError(
                    f"El nivel de interés de '{categoria}' debe estar entre 0 y 1."
                )


@dataclass(frozen=True)
class AtractivoCandidato:
    """Datos mínimos de un atractivo para calcular su puntaje.

    ``distancia_km`` permite reutilizar una distancia ya calculada en la
    base de datos (issue #27: ``ST_DistanceSphere``) en lugar de repetir
    el cálculo Haversine en Python. Si es ``None``, se calcula aquí.
    """

    id_atractivo: str
    nombre: str
    categorias: frozenset[str]
    costo_bob: Decimal
    duracion_horas: Decimal
    latitud: float
    longitud: float
    distancia_km: float | None = None

    def __post_init__(self) -> None:
        if self.costo_bob < 0:
            raise ValueError("costo_bob no puede ser negativo.")
        if self.duracion_horas < 0:
            raise ValueError("duracion_horas no puede ser negativa.")
        if self.distancia_km is not None and self.distancia_km < 0:
            raise ValueError("distancia_km no puede ser negativa.")


@dataclass(frozen=True)
class Puntuacion:
    """Resultado explicable del motor para un atractivo."""

    id_atractivo: str
    nombre: str
    puntaje: float
    afinidad_categoria: float
    proximidad: float
    holgura_presupuesto: float
    holgura_tiempo: float
    distancia_km: float
    factor_penalizacion: float
    viable: bool
    excluido: bool
    motivos: tuple[str, ...] = ()


class Puntuador:
    """Calcula y ordena puntajes con una configuración de ponderación."""

    def __init__(self, configuracion: ConfiguracionPonderacion | None = None) -> None:
        self.configuracion = configuracion or ConfiguracionPonderacion()

    def puntuar(
        self, perfil: PerfilTuristico, atractivo: AtractivoCandidato
    ) -> Puntuacion:
        config = self.configuracion
        afinidad = self._afinidad_categoria(perfil, atractivo)
        distancia = (
            atractivo.distancia_km
            if atractivo.distancia_km is not None
            else distancia_haversine_km(
                perfil.latitud,
                perfil.longitud,
                atractivo.latitud,
                atractivo.longitud,
            )
        )
        proximidad = _acotar(1.0 - distancia / config.radio_km)
        holgura_presupuesto = self._holgura(atractivo.costo_bob, perfil.presupuesto_bob)
        holgura_tiempo = self._holgura(atractivo.duracion_horas, perfil.tiempo_horas)

        motivos: list[str] = []
        factor = 1.0
        if atractivo.costo_bob > perfil.presupuesto_bob:
            motivos.append("presupuesto_excedido")
            factor *= config.factor_fuera_presupuesto
        if atractivo.duracion_horas > perfil.tiempo_horas:
            motivos.append("tiempo_excedido")
            factor *= config.factor_fuera_tiempo

        puntaje_base = (
            config.peso_categoria * afinidad
            + config.peso_distancia * proximidad
            + config.peso_presupuesto * holgura_presupuesto
            + config.peso_tiempo * holgura_tiempo
        )
        excluido = config.filtros_estrictos and bool(motivos)
        puntaje = 0.0 if excluido else puntaje_base * factor

        return Puntuacion(
            id_atractivo=atractivo.id_atractivo,
            nombre=atractivo.nombre,
            puntaje=round(_acotar(puntaje), 6),
            afinidad_categoria=round(afinidad, 6),
            proximidad=round(proximidad, 6),
            holgura_presupuesto=round(holgura_presupuesto, 6),
            holgura_tiempo=round(holgura_tiempo, 6),
            distancia_km=round(distancia, 3),
            factor_penalizacion=round(factor, 6),
            viable=not motivos,
            excluido=excluido,
            motivos=tuple(motivos),
        )

    def rankear(
        self,
        perfil: PerfilTuristico,
        atractivos: Iterable[AtractivoCandidato],
        top_k: int | None = None,
    ) -> list[Puntuacion]:
        """Ordena por puntaje descendente y desempata por cercanía e id."""

        if top_k is not None and top_k < 0:
            raise ValueError("top_k no puede ser negativo.")

        puntuaciones = [self.puntuar(perfil, atractivo) for atractivo in atractivos]
        puntuaciones.sort(key=lambda p: (-p.puntaje, p.distancia_km, p.id_atractivo))
        return puntuaciones if top_k is None else puntuaciones[:top_k]

    @staticmethod
    def _afinidad_categoria(
        perfil: PerfilTuristico, atractivo: AtractivoCandidato
    ) -> float:
        if not perfil.preferencias:
            return 0.0
        preferencias = {
            _normalizar_categoria(categoria): nivel
            for categoria, nivel in perfil.preferencias.items()
        }
        total_interes = sum(preferencias.values())
        if total_interes <= 0:
            return 0.0
        coincidencias = sum(
            preferencias.get(_normalizar_categoria(categoria), Decimal("0"))
            for categoria in atractivo.categorias
        )
        return _acotar(float(coincidencias / total_interes))

    @staticmethod
    def _holgura(consumo: Decimal, disponible: Decimal) -> float:
        if disponible <= 0:
            return 1.0 if consumo <= 0 else 0.0
        return _acotar(1.0 - float(consumo / disponible))


def rankear_atractivos(
    perfil: PerfilTuristico,
    atractivos: Sequence[AtractivoCandidato],
    configuracion: ConfiguracionPonderacion | None = None,
    top_k: int | None = None,
) -> list[Puntuacion]:
    """Atajo funcional para el caso de uso más común."""

    return Puntuador(configuracion).rankear(perfil, atractivos, top_k=top_k)
