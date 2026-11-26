"""Salida HTTP controlada para el enriquecimiento de destinos.

Todo tráfico pasa por el descargador allowlistado del host (socket Unix). El
backend y el worker no tienen salida directa a internet; este módulo es la
única puerta para fichas oficiales, Wikimedia y Cloudinary. Nunca se usan
credenciales ni servicios de Google Maps.
"""

from __future__ import annotations

import base64
import json
import socket
import time
from urllib.parse import urlencode

from django.conf import settings


class SalidaNoDisponible(ConnectionError):
    """El proxy o la fuente no respondieron correctamente."""


def _ruta_socket() -> str:
    proxy = settings.FUENTES_ABIERTAS_PROXY_URL or ""
    if not proxy.startswith("unix://"):
        raise SalidaNoDisponible(
            "FUENTES_ABIERTAS_PROXY_URL debe apuntar al socket del descargador."
        )
    return proxy[len("unix://") :]


def solicitar(
    url: str,
    *,
    params: dict | None = None,
    cuerpo: bytes | None = None,
    cabeceras: dict[str, str] | None = None,
    metodo: str | None = None,
) -> bytes:
    """Descarga una URL autorizada y devuelve el cuerpo como bytes.

    ``cuerpo`` permite enviar multipart binario (subida de imágenes); el
    protocolo del proxy lo transporta en base64. Las redirecciones y los
    hosts no permitidos los rechaza el propio proxy.
    """

    destino = url
    if params:
        separador = "&" if "?" in url else "?"
        destino = url + separador + urlencode(params)
    cabeceras_permitidas = {"User-Agent": settings.FUENTES_ABIERTAS_USER_AGENT}
    cabeceras_permitidas.update(
        {
            clave: valor
            for clave, valor in (cabeceras or {}).items()
            if clave in {"User-Agent", "Accept", "Content-Type"}
        }
    )
    peticion: dict[str, object] = {
        "url": destino,
        "metodo": metodo or ("POST" if cuerpo is not None else "GET"),
        "cabeceras": cabeceras_permitidas,
    }
    if cuerpo is not None:
        peticion["cuerpo_base64"] = base64.b64encode(cuerpo).decode("ascii")
    else:
        peticion["cuerpo"] = ""

    ultimo_error: SalidaNoDisponible | None = None
    for intento in range(3):
        try:
            with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as cliente:
                cliente.settimeout(settings.FUENTES_ABIERTAS_TIMEOUT_SECONDS + 10)
                try:
                    cliente.connect(_ruta_socket())
                    cliente.sendall(json.dumps(peticion).encode("utf-8") + b"\n")
                    with cliente.makefile("rb") as lector:
                        linea = lector.readline(12 * 1024 * 1024)
                except OSError as exc:
                    raise SalidaNoDisponible(
                        f"No se pudo contactar al descargador: {exc}"
                    ) from exc

            if not linea:
                raise SalidaNoDisponible("El descargador no respondió.")
            try:
                respuesta = json.loads(linea.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise SalidaNoDisponible("Respuesta inválida del descargador.") from exc
            if "error" in respuesta:
                raise SalidaNoDisponible(f"Descargador: {respuesta['error']}")
            estado = int(respuesta.get("estado", 200))
            if not 200 <= estado < 300:
                raise SalidaNoDisponible(f"La fuente devolvió HTTP {estado}")
            return base64.b64decode(respuesta.get("cuerpo", ""), validate=True)
        except (SalidaNoDisponible, ValueError, TypeError) as exc:
            ultimo_error = (
                exc if isinstance(exc, SalidaNoDisponible) else SalidaNoDisponible(str(exc))
            )
            mensaje = str(exc)
            transient = (
                "HTTP 429" in mensaje
                or any(f"HTTP 5{codigo}" in mensaje for codigo in range(10))
                or "No se pudo contactar" in mensaje
            )
            if not transient or intento == 2:
                raise ultimo_error from exc
            time.sleep(2 * intento + 1)
    raise ultimo_error or SalidaNoDisponible("La fuente no respondió.")
