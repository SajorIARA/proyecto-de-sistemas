"""Descarga segura y extracción de texto para fuentes documentales.

El módulo no descubre URLs. Solo procesa URLs explícitas dentro de una
allowlist y rechaza destinos locales/privados para reducir el riesgo SSRF.
"""

from __future__ import annotations

import ipaddress
import re
import socket
import threading
import time
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Iterable
from urllib import error, request, robotparser
from urllib.parse import urljoin, urlsplit, urlunsplit


class ScrapingError(Exception):
    """Error controlado del pipeline de scraping."""


class URLNoPermitida(ScrapingError):
    """La URL no cumple la política de seguridad."""


class ErrorDescarga(ScrapingError):
    """La fuente no pudo descargarse de forma válida."""


class ErrorHTTP(ErrorDescarga):
    def __init__(self, status: int) -> None:
        self.status = status
        super().__init__(f"La fuente respondió HTTP {status}.")


class RobotsNoPermitido(ScrapingError):
    """robots.txt prohíbe descargar la URL."""


class ContenidoInvalido(ScrapingError):
    """La respuesta no contiene HTML textual aprovechable."""


@dataclass(frozen=True)
class DocumentoWeb:
    url: str
    titulo: str
    texto: str


@dataclass(frozen=True)
class _Respuesta:
    url: str
    status: int
    headers: object
    contenido: bytes


class _SinRedirecciones(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_OPENER = request.build_opener(_SinRedirecciones())
_ULTIMA_SOLICITUD: dict[str, float] = {}
_LOCK_RATE = threading.Lock()


def _dominio_permitido(host: str, permitidos: Iterable[str]) -> bool:
    host = host.lower().rstrip(".")
    return any(host == base or host.endswith(f".{base}") for base in permitidos)


def _resolver_ips(host: str, port: int) -> set[str]:
    try:
        resultados = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise URLNoPermitida(f"No se pudo resolver el dominio: {host}.") from exc
    return {resultado[4][0] for resultado in resultados}


def validar_url(url: str, dominios_permitidos: Iterable[str]) -> str:
    """Normaliza y valida esquema, dominio, puerto y direcciones resueltas."""

    if not isinstance(url, str) or len(url) > 2048:
        raise URLNoPermitida("La URL es inválida o supera 2048 caracteres.")
    partes = urlsplit(url.strip())
    if partes.scheme.lower() not in {"http", "https"}:
        raise URLNoPermitida("Solo se permiten URLs HTTP o HTTPS.")
    if not partes.hostname or partes.username or partes.password:
        raise URLNoPermitida("La URL no debe incluir credenciales.")
    try:
        host = partes.hostname.encode("idna").decode("ascii").lower().rstrip(".")
        port = partes.port or (443 if partes.scheme.lower() == "https" else 80)
    except (UnicodeError, ValueError) as exc:
        raise URLNoPermitida("Dominio o puerto inválido.") from exc
    puerto_esperado = 443 if partes.scheme.lower() == "https" else 80
    if port != puerto_esperado:
        raise URLNoPermitida("Solo se permiten los puertos HTTP/HTTPS estándar.")
    permitidos = tuple(d.lower().rstrip(".") for d in dominios_permitidos if d)
    if not permitidos or not _dominio_permitido(host, permitidos):
        raise URLNoPermitida(f"Dominio no permitido: {host}.")
    ips = _resolver_ips(host, port)
    if not ips:
        raise URLNoPermitida(f"El dominio no tiene direcciones válidas: {host}.")
    for valor in ips:
        try:
            ip = ipaddress.ip_address(valor.split("%", 1)[0])
        except ValueError as exc:
            raise URLNoPermitida("El dominio resolvió a una IP inválida.") from exc
        if not ip.is_global:
            raise URLNoPermitida(
                f"El dominio {host} resuelve a una red local o no pública."
            )
    netloc = host
    return urlunsplit(
        (partes.scheme.lower(), netloc, partes.path or "/", partes.query, "")
    )


def _esperar_rate_limit(host: str, intervalo: float) -> None:
    if intervalo <= 0:
        return
    with _LOCK_RATE:
        ahora = time.monotonic()
        espera = intervalo - (ahora - _ULTIMA_SOLICITUD.get(host, 0.0))
        if espera > 0:
            time.sleep(espera)
        _ULTIMA_SOLICITUD[host] = time.monotonic()


def _solicitar(
    url: str,
    *,
    user_agent: str,
    timeout: float,
    max_bytes: int,
    intervalo: float,
) -> _Respuesta:
    host = urlsplit(url).hostname or ""
    _esperar_rate_limit(host, intervalo)
    peticion = request.Request(
        url,
        headers={
            "User-Agent": user_agent,
            "Accept": "text/html,text/plain;q=0.8",
        },
    )
    try:
        respuesta = _OPENER.open(peticion, timeout=timeout)
    except error.HTTPError as exc:
        # urllib representa las redirecciones no seguidas como HTTPError.
        if exc.code in {301, 302, 303, 307, 308}:
            return _Respuesta(url, exc.code, exc.headers, b"")
        raise ErrorHTTP(exc.code) from exc
    except (error.URLError, TimeoutError, OSError) as exc:
        raise ErrorDescarga(f"No se pudo descargar {host}: {exc}.") from exc
    with respuesta:
        largo = respuesta.headers.get("Content-Length")
        if largo and int(largo) > max_bytes:
            raise ErrorDescarga("La respuesta supera el tamaño máximo permitido.")
        contenido = respuesta.read(max_bytes + 1)
        if len(contenido) > max_bytes:
            raise ErrorDescarga("La respuesta supera el tamaño máximo permitido.")
        return _Respuesta(
            respuesta.geturl(), respuesta.status, respuesta.headers, contenido
        )


def _robots_permite(
    url: str,
    *,
    dominios_permitidos: Iterable[str],
    user_agent: str,
    timeout: float,
    max_bytes: int,
    intervalo: float,
) -> bool:
    partes = urlsplit(url)
    robots_url = urlunsplit((partes.scheme, partes.netloc, "/robots.txt", "", ""))
    try:
        respuesta = _solicitar(
            robots_url,
            user_agent=user_agent,
            timeout=timeout,
            max_bytes=min(max_bytes, 512 * 1024),
            intervalo=intervalo,
        )
    except ErrorHTTP as exc:
        if exc.status in {401, 403}:
            return False
        return True
    except ErrorDescarga:
        # robots ausente/inaccesible no bloquea; una prohibición explícita sí.
        return True
    if respuesta.status in {301, 302, 303, 307, 308}:
        destino = respuesta.headers.get("Location")
        if not destino:
            return True
        robots_url = validar_url(urljoin(robots_url, destino), dominios_permitidos)
        try:
            respuesta = _solicitar(
                robots_url,
                user_agent=user_agent,
                timeout=timeout,
                max_bytes=min(max_bytes, 512 * 1024),
                intervalo=intervalo,
            )
        except ErrorDescarga:
            return True
    parser = robotparser.RobotFileParser()
    parser.set_url(robots_url)
    texto = respuesta.contenido.decode("utf-8", errors="replace")
    parser.parse(texto.splitlines())
    return parser.can_fetch(user_agent, url)


def descargar(
    url: str,
    *,
    dominios_permitidos: Iterable[str],
    user_agent: str,
    timeout: float = 15,
    max_bytes: int = 2 * 1024 * 1024,
    max_redirects: int = 3,
    intervalo: float = 1,
) -> tuple[str, bytes, object]:
    actual = validar_url(url, dominios_permitidos)
    if not _robots_permite(
        actual,
        dominios_permitidos=dominios_permitidos,
        user_agent=user_agent,
        timeout=timeout,
        max_bytes=max_bytes,
        intervalo=intervalo,
    ):
        raise RobotsNoPermitido("robots.txt no permite descargar esta URL.")
    for _ in range(max_redirects + 1):
        respuesta = _solicitar(
            actual,
            user_agent=user_agent,
            timeout=timeout,
            max_bytes=max_bytes,
            intervalo=intervalo,
        )
        if respuesta.status not in {301, 302, 303, 307, 308}:
            tipo = respuesta.headers.get("Content-Type", "").lower()
            if "text/html" not in tipo and "application/xhtml+xml" not in tipo:
                raise ContenidoInvalido("La fuente no devolvió contenido HTML.")
            return actual, respuesta.contenido, respuesta.headers
        destino = respuesta.headers.get("Location")
        if not destino:
            raise ErrorDescarga("La redirección no incluye destino.")
        actual = validar_url(urljoin(actual, destino), dominios_permitidos)
        if not _robots_permite(
            actual,
            dominios_permitidos=dominios_permitidos,
            user_agent=user_agent,
            timeout=timeout,
            max_bytes=max_bytes,
            intervalo=intervalo,
        ):
            raise RobotsNoPermitido(
                "robots.txt del destino redirigido no permite descargar la URL."
            )
    raise ErrorDescarga("La fuente excedió el máximo de redirecciones.")


class _ExtractorHTML(HTMLParser):
    OMITIR = {"script", "style", "svg", "noscript", "form", "nav", "footer", "aside"}
    BLOQUES = {
        "article",
        "blockquote",
        "br",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "li",
        "main",
        "p",
        "section",
        "tr",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.titulo: list[str] = []
        self.general: list[str] = []
        self.principal: list[str] = []
        self._omitidos = 0
        self._titulo = 0
        self._principal = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        tag = tag.lower()
        if tag in self.OMITIR:
            self._omitidos += 1
        if tag == "title":
            self._titulo += 1
        if tag in {"main", "article"}:
            self._principal += 1
        if tag in self.BLOQUES and not self._omitidos:
            self._agregar("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in self.BLOQUES and not self._omitidos:
            self._agregar("\n")
        if tag in self.OMITIR and self._omitidos:
            self._omitidos -= 1
        if tag == "title" and self._titulo:
            self._titulo -= 1
        if tag in {"main", "article"} and self._principal:
            self._principal -= 1

    def handle_data(self, data: str) -> None:
        if self._omitidos:
            return
        if self._titulo:
            self.titulo.append(data)
        self._agregar(data)

    def _agregar(self, data: str) -> None:
        self.general.append(data)
        if self._principal:
            self.principal.append(data)


def _limpiar_texto(partes: Iterable[str]) -> str:
    texto = "".join(partes).replace("\xa0", " ")
    lineas = []
    for linea in texto.splitlines():
        limpia = re.sub(r"\s+", " ", linea).strip()
        if limpia:
            lineas.append(limpia)
    return "\n\n".join(lineas)


def extraer_documento(url: str, contenido: bytes, headers: object) -> DocumentoWeb:
    charset = None
    if hasattr(headers, "get_content_charset"):
        charset = headers.get_content_charset()
    html = contenido.decode(charset or "utf-8", errors="replace")
    parser = _ExtractorHTML()
    try:
        parser.feed(html)
        parser.close()
    except (ValueError, AssertionError) as exc:
        raise ContenidoInvalido("El HTML de la fuente está malformado.") from exc
    principal = _limpiar_texto(parser.principal)
    texto = principal if len(principal) >= 100 else _limpiar_texto(parser.general)
    if len(texto) < 100:
        raise ContenidoInvalido("La página no contiene suficiente texto útil.")
    titulo = re.sub(r"\s+", " ", "".join(parser.titulo)).strip()
    if not titulo:
        titulo = urlsplit(url).hostname or "Fuente web"
    return DocumentoWeb(url=url, titulo=titulo[:250], texto=texto)


def scrapear_url(url: str, **opciones) -> DocumentoWeb:
    final, contenido, headers = descargar(url, **opciones)
    return extraer_documento(final, contenido, headers)
