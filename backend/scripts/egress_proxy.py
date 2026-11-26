"""Descargador allowlistado para desarrollo local con Docker.

Los bridges de Docker no tienen salida a internet y el firewall del host tampoco
acepta conexiones desde ellos. Este proceso corre en el namespace de red del
host y expone un socket Unix en el volumen compartido `staging_data`; el backend
y el worker le piden que descargue una URL pública autorizada.

No es un proxy genérico: solo acepta HTTPS hacia la allowlist, sin Google Maps,
sin credenciales y sin seguir redirecciones a otros hosts.
"""

from __future__ import annotations

import base64
import binascii
import json
import os
import socketserver
import sys
import urllib.error
import urllib.parse
import urllib.request

ALLOWED_POR_DEFECTO = (
    "overpass-api.de",
    "maps.mail.ru",
    "www.wikidata.org",
    "query.wikidata.org",
    "nominatim.openstreetmap.org",
    "lapaz.bo",
    "www.lapaz.bo",
    "miteleferico.bo",
    "www.miteleferico.bo",
    "commons.wikimedia.org",
    "upload.wikimedia.org",
    "thumb.wikimedia.org",
    "api.cloudinary.com",
    "es.wikipedia.org",
    "en.wikipedia.org",
    "www.openstreetmap.org",
    "sitservicios.lapaz.bo",
    "www.aecid.es",
    "ccelp.aecid.es",
    "laboliviana.com",
    "www.laboliviana.com",
    "larufinabolivia.com",
    "www.larufinabolivia.com",
    "www.instagram.com",
    "www.facebook.com",
    "www.tiktok.com",
)
RUTA_SOCKET = os.getenv(
    "EGRESS_PROXY_SOCKET", "/app/staging/egress-proxy.sock"
)
TIEMPO_ESPERA = float(os.getenv("EGRESS_PROXY_TIMEOUT", "30"))
MAX_RESPUESTA = int(os.getenv("EGRESS_PROXY_MAX_BYTES", str(3 * 1024 * 1024)))
MAX_SOLICITUD = 8 * 1024 * 1024
CABECERAS_PERMITIDAS = ("User-Agent", "Accept", "Content-Type")
METODOS_PERMITIDOS = ("GET", "POST")


class SinRedirecciones(urllib.request.HTTPRedirectHandler):
    """Las redirecciones podrían salir de la allowlist: se rechazan."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def hosts_permitidos() -> set[str]:
    crudo = os.getenv("EGRESS_PROXY_ALLOWED_HOSTS", ",".join(ALLOWED_POR_DEFECTO))
    return {host.strip().lower().rstrip(".") for host in crudo.split(",") if host.strip()}


def validar_url(url: str) -> str:
    """Devuelve el host normalizado o lanza ValueError si no es autorizado."""

    partes = urllib.parse.urlsplit(url)
    if partes.scheme != "https":
        raise ValueError("Solo se permiten URLs HTTPS")
    host = (partes.hostname or "").lower().rstrip(".")
    if host not in hosts_permitidos() or partes.port not in (None, 443):
        raise ValueError(f"Host no autorizado: {host or '(vacío)'}")
    return host


class ManejadorDescarga(socketserver.StreamRequestHandler):
    def responder(self, **datos: object) -> None:
        try:
            self.wfile.write(json.dumps(datos).encode("utf-8") + b"\n")
            self.wfile.flush()
        except OSError:
            # El cliente (o el healthcheck) puede cerrar antes de leer.
            pass

    def handle(self) -> None:
        try:
            linea = self.rfile.readline(MAX_SOLICITUD)
            if not linea:
                return  # healthcheck: solo abre y cierra el socket
            solicitud = json.loads(linea.decode("utf-8"))
            url = str(solicitud["url"])
            metodo = str(solicitud.get("metodo", "GET")).upper()
            # `cuerpo` es texto (Overpass); `cuerpo_base64` permite subir
            # binarios (imágenes a Cloudinary) sin carry bytes en JSON.
            if solicitud.get("cuerpo_base64") is not None:
                try:
                    cuerpo = base64.b64decode(
                        str(solicitud["cuerpo_base64"]), validate=True
                    )
                except (binascii.Error, ValueError) as exc:
                    raise ValueError("cuerpo_base64 no es base64 válido") from exc
            else:
                cuerpo = str(solicitud.get("cuerpo", "")).encode("utf-8")
            if metodo not in METODOS_PERMITIDOS:
                raise ValueError("Método no permitido")
            host = validar_url(url)

            cabeceras = {
                clave: str(valor)
                for clave, valor in dict(solicitud.get("cabeceras") or {}).items()
                if clave in CABECERAS_PERMITIDAS
            }
            peticion = urllib.request.Request(
                url,
                data=cuerpo if metodo == "POST" else None,
                headers=cabeceras,
                method=metodo,
            )
            opener = urllib.request.build_opener(SinRedirecciones)
            # El host sí tiene salida; no heredamos proxies del entorno.
            opener.add_handler(urllib.request.ProxyHandler({}))
            with opener.open(
                peticion, timeout=TIEMPO_ESPERA
            ) as respuesta:
                estado = respuesta.status
                crudo = respuesta.read(MAX_RESPUESTA + 1)
            if len(crudo) > MAX_RESPUESTA:
                raise ValueError("La respuesta excede el tamaño máximo")
            print(f"{metodo} autorizado: {host} -> {estado}", flush=True)
            self.responder(
                estado=estado, cuerpo=base64.b64encode(crudo).decode("ascii")
            )
        except (KeyError, TypeError, ValueError) as exc:
            print(f"Solicitud rechazada: {exc}", flush=True)
            self.responder(error=str(exc)[:300])
        except urllib.error.HTTPError as exc:
            destino = str(solicitud.get("url", ""))[:120]
            print(f"HTTP {exc.code}: {destino}", flush=True)
            self.responder(estado=exc.code, cuerpo="")
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            print(f"Descarga fallida: {type(exc).__name__}", flush=True)
            self.responder(error=f"No se pudo contactar a la fuente: {exc}"[:300])


class ServidorDescarga(socketserver.ThreadingUnixStreamServer):
    daemon_threads = True
    allow_reuse_address = True


def main() -> None:
    try:
        os.unlink(RUTA_SOCKET)
    except FileNotFoundError:
        pass
    os.makedirs(os.path.dirname(RUTA_SOCKET), exist_ok=True)
    print(
        f"descargador allowlistado en {RUTA_SOCKET} -> "
        + ", ".join(sorted(hosts_permitidos())),
        flush=True,
    )
    with ServidorDescarga(RUTA_SOCKET, ManejadorDescarga) as servidor:
        os.chmod(RUTA_SOCKET, 0o660)
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            servidor.shutdown()
            try:
                os.unlink(RUTA_SOCKET)
            except FileNotFoundError:
                pass
    sys.exit(0)


if __name__ == "__main__":
    main()
