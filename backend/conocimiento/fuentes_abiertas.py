"""Descubrimiento de lugares en fuentes abiertas (sin Google Maps).

Este módulo corre **solo en el backend**. Consulta Overpass (OpenStreetMap) y
la API de Wikidata con ``urllib``, sin dependencias nuevas, con timeout,
user-agent identificable, límite de bytes y un intervalo mínimo entre llamadas.

Las condiciones de Google Maps no permiten extraer, indexar ni reutilizar
contenido de Places para construir este dataset; Google solo puede ser un
enlace externo. Tampoco se descargan imágenes de Wikimedia: evitar imágenes
sin metadata de licencia mantiene pequeña y segura la primera entrega.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import re
import socket
import threading
import time
import unicodedata
from dataclasses import asdict, dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import ProxyHandler, Request, build_opener

from django.conf import settings

FUENTES_DISPONIBLES = ("overpass", "wikidata")

# Coordenadas delimitadas: evita que una búsqueda textual devuelva lugares de
# otra ciudad. Orden explícito: (sur, oeste, norte, este), el mismo que usa
# Overpass. El administrador puede ampliar este mapa sin tocar el cliente.
CIUDADES_BBOX: dict[str, tuple[float, float, float, float]] = {
    "la paz": (-16.63, -68.22, -16.45, -68.00),
    "el alto": (-16.62, -68.35, -16.44, -68.10),
}

CATEGORIAS_POR_TAG = {
    "museum": "Cultura",
    "gallery": "Cultura",
    "artwork": "Cultura",
    "attraction": "Cultura",
    "restaurant": "Gastronomía",
    "cafe": "Gastronomía",
    "fast_food": "Gastronomía",
    "bar": "Gastronomía",
    "park": "Naturaleza",
    "garden": "Naturaleza",
    "nature_reserve": "Naturaleza",
    "viewpoint": "Mirador",
    "marketplace": "Compras",
    "supermarket": "Compras",
    "place_of_worship": "Patrimonio",
    "monument": "Patrimonio",
    "castle": "Patrimonio",
}

CATEGORIAS_POR_PALABRA = (
    (("museo", "galería", "galeria"), "Cultura"),
    (("parque", "jardín", "jardin", "reserva"), "Naturaleza"),
    (("restaurante", "café", "cafe"), "Gastronomía"),
    (("mirador",), "Mirador"),
    (("mercado",), "Compras"),
    (("iglesia", "catedral", "basílica", "basilica"), "Patrimonio"),
)

# Consulta Overpass: combinamos una etiqueta OSM conocida con el nombre para
# que "bares de La Paz" encuentre amenity=bar, no solo nombres con la frase.
ETIQUETAS_POR_PALABRA = {
    "bar": ("amenity", "bar"),
    "bares": ("amenity", "bar"),
    "pub": ("amenity", "pub"),
    "taberna": ("amenity", "bar"),
    "mirador": ("tourism", "viewpoint"),
    "miradores": ("tourism", "viewpoint"),
    "museo": ("tourism", "museum"),
    "museos": ("tourism", "museum"),
    "restaurante": ("amenity", "restaurant"),
    "restaurantes": ("amenity", "restaurant"),
    "cafe": ("amenity", "cafe"),
    "cafes": ("amenity", "cafe"),
    "parque": ("leisure", "park"),
    "parques": ("leisure", "park"),
    "mercado": ("amenity", "marketplace"),
    "mercados": ("amenity", "marketplace"),
    "iglesia": ("amenity", "place_of_worship"),
    "iglesias": ("amenity", "place_of_worship"),
    "catedral": ("amenity", "place_of_worship"),
}
BASE_POR_PALABRA = {
    "bares": "bar",
    "miradores": "mirador",
    "museos": "museo",
    "restaurantes": "restaurante",
    "cafes": "cafe",
    "parques": "parque",
    "mercados": "mercado",
    "iglesias": "iglesia",
}
PALABRAS_VACIAS = frozenset(
    {"de", "del", "la", "las", "el", "los", "en", "y", "ciudad", "centro"}
)

LICENCIA_OVERPASS = "ODbL — OpenStreetMap contributors"
LICENCIA_WIKIDATA = "CC0-1.0 (Wikidata); descripciones CC BY-SA"

_ultima_llamada: dict[str, float] = {}
_bloqueo_llamadas = threading.Lock()


class FuenteAbiertaError(Exception):
    """Fallo acotado a una fuente; las demás pueden continuar."""

    def __init__(self, fuente: str, mensaje: str) -> None:
        super().__init__(mensaje)
        self.fuente = fuente


@dataclass(frozen=True)
class CandidatoLugar:
    """DTO normalizado. Los campos ausentes quedan vacíos, nunca inventados."""

    fuente: str
    id_externo: str
    nombre: str
    descripcion: str = ""
    categoria_sugerida: str = ""
    latitud: float | None = None
    longitud: float | None = None
    direccion: str = ""
    horario_declarado: str = ""
    sitio_web: str = ""
    url_fuente: str = ""
    licencia: str = ""

    @property
    def hash_contenido(self) -> str:
        datos = asdict(self)
        crudo = json.dumps(datos, ensure_ascii=False, sort_keys=True)
        return hashlib.sha256(crudo.encode("utf-8")).hexdigest()


def _sin_tildes(texto: str) -> str:
    return "".join(
        caracter
        for caracter in unicodedata.normalize("NFKD", texto)
        if not unicodedata.combining(caracter)
    )


def validar_ciudad(ciudad: str) -> tuple[str, tuple[float, float, float, float]]:
    """Devuelve la clave normalizada y su bounding box, o ``ValueError``."""

    clave = _sin_tildes(ciudad).strip().lower()
    clave = "la paz" if clave in {"lapaz", "la-paz"} else clave
    bbox = CIUDADES_BBOX.get(clave)
    if bbox is None:
        soportadas = ", ".join(sorted(CIUDADES_BBOX))
        raise ValueError(f"Ciudad no soportada: {ciudad}. Usá una de: {soportadas}.")
    return clave, bbox


def validar_termino(termino: str) -> str:
    """Acepta texto de búsqueda simple y rechaza caracteres de consulta."""

    limpio = " ".join((termino or "").split())
    if not 3 <= len(limpio) <= 120:
        raise ValueError("La búsqueda debe tener entre 3 y 120 caracteres.")
    if not re.fullmatch(r"[\w\s'’\-]+", limpio, flags=re.UNICODE):
        raise ValueError("La búsqueda solo admite letras, números, espacios y guiones.")
    return limpio


def validar_limite(limite: int) -> int:
    if not 1 <= int(limite) <= settings.FUENTES_ABIERTAS_MAX_LIMITE:
        maximo = settings.FUENTES_ABIERTAS_MAX_LIMITE
        raise ValueError(f"El límite debe estar entre 1 y {maximo}.")
    return int(limite)


def _terminos_de_busqueda(termino: str, ciudad: str) -> list[str]:
    """Quita ciudad y palabras vacías; conserva solo términos útiles."""

    tokens = re.findall(r"\w+", _sin_tildes(termino).lower(), re.UNICODE)
    de_la_ciudad = set(
        re.findall(r"\w+", _sin_tildes(ciudad).lower(), re.UNICODE)
    )
    utiles = [
        token
        for token in tokens
        if token not in PALABRAS_VACIAS and token not in de_la_ciudad
    ]
    return utiles or tokens


def _variantes(palabra: str) -> set[str]:
    base = BASE_POR_PALABRA.get(palabra, palabra)
    return {palabra, base, f"{base}s"}


def _consulta_overpass(
    termino: str,
    ciudad: str,
    bbox: tuple[float, float, float, float],
    limite: int,
) -> str:
    """Construye una unión de etiquetas OSM y nombres, sin frase exacta."""

    caja = ",".join(str(valor) for valor in bbox)
    filtros: set[str] = set()
    variantes: set[str] = set()
    for palabra in _terminos_de_busqueda(termino, ciudad):
        if palabra in ETIQUETAS_POR_PALABRA:
            clave, valor = ETIQUETAS_POR_PALABRA[palabra]
            filtros.add(f'nwr["{clave}"="{valor}"]({caja});')
        variantes.update(_variantes(palabra))
    palabras = "|".join(
        re.escape(variante)
        for variante in sorted(variantes, key=len, reverse=True)
    ) or re.escape(termino)
    # El nombre es complemento de la etiqueta OSM: "bar" no debe encontrar
    # "Barrio" ni "Casabar". Overpass usa regex POSIX, sin \b.
    patron = rf"(^|[^[:alnum:]])({palabras})([^[:alnum:]]|$)"
    partes = sorted(filtros)
    partes.append(f'nwr["name"~"{patron}",i]({caja});')
    return f'[out:json][timeout:25];({"".join(partes)});out center {limite};'


def _urls_overpass() -> list[str]:
    """Principal + espejos, sin duplicados y en orden configurado."""

    crudas = [settings.FUENTES_ABIERTAS_OVERPASS_URL]
    crudas.extend(getattr(settings, "FUENTES_ABIERTAS_OVERPASS_URLS", []))
    urls: list[str] = []
    vistas: set[str] = set()
    for url in crudas:
        normalizada = str(url).strip().rstrip("/")
        if normalizada and normalizada not in vistas:
            vistas.add(normalizada)
            urls.append(normalizada)
    return urls


def _esperar_turno(fuente: str) -> None:
    """Rate limit mínimo por fuente, compartido entre hilos del proceso."""

    intervalo = max(0.0, settings.FUENTES_ABIERTAS_MIN_INTERVAL_SECONDS)
    if intervalo == 0:
        return
    with _bloqueo_llamadas:
        ahora = time.monotonic()
        resto = _ultima_llamada.get(fuente, 0.0) + intervalo - ahora
        if resto > 0:
            time.sleep(resto)
        _ultima_llamada[fuente] = time.monotonic()


def _opener_para_fuentes():
    """Opener explícito: solo usa proxy si la configuración lo indica."""

    proxy = settings.FUENTES_ABIERTAS_PROXY_URL
    manejador = ProxyHandler({} if not proxy else {"http": proxy, "https": proxy})
    return build_opener(manejador)


def _ruta_socket_proxy() -> str | None:
    """El proxy local usa un socket Unix compartido, no TCP (firewall)."""

    proxy = settings.FUENTES_ABIERTAS_PROXY_URL
    if proxy.startswith("unix://"):
        return proxy[len("unix://") :]
    return None


def _parsear_json(crudo: bytes) -> dict:
    if len(crudo) > settings.FUENTES_ABIERTAS_MAX_BYTES:
        raise ValueError("La respuesta excede el tamaño máximo permitido.")
    try:
        return json.loads(crudo.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("La fuente no devolvió JSON válido.") from exc


def _descargar_por_socket(
    ruta: str, url: str, params: dict | None, datos: dict | None, cabeceras: dict
) -> bytes:
    """Pide al descargador del host una URL allowlistada por socket Unix."""

    cuerpo = b""
    destino = url
    if datos is not None:
        cuerpo = urlencode(datos).encode("utf-8")
        cabeceras = {**cabeceras, "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"}
    else:
        separador = "&" if "?" in url else "?"
        destino = url + separador + urlencode(params or {})

    solicitud = {
        "url": destino,
        "metodo": "POST" if datos is not None else "GET",
        "cuerpo": cuerpo.decode("ascii"),
        "cabeceras": cabeceras,
    }
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as cliente:
        cliente.settimeout(settings.FUENTES_ABIERTAS_TIMEOUT_SECONDS + 10)
        try:
            cliente.connect(ruta)
            cliente.sendall(json.dumps(solicitud).encode("utf-8") + b"\n")
            with cliente.makefile("rb") as lector:
                linea = lector.readline(settings.FUENTES_ABIERTAS_MAX_BYTES * 2)
        except OSError as exc:
            raise ConnectionError(f"No se pudo contactar al descargador: {exc}") from exc

    if not linea:
        raise ConnectionError("El descargador no respondió.")
    try:
        respuesta = json.loads(linea.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ConnectionError("El descargador devolvió una respuesta inválida.") from exc
    if "error" in respuesta:
        raise ConnectionError(f"Descargador: {respuesta['error']}")
    estado = int(respuesta.get("estado", 200))
    if not 200 <= estado < 300:
        raise ConnectionError(f"La fuente devolvió HTTP {estado}")
    try:
        return base64.b64decode(respuesta.get("cuerpo", ""), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ConnectionError("El descargador devolvió un cuerpo inválido.") from exc


def _descargar_json(
    url: str, *, params: dict | None = None, datos: dict | None = None
) -> dict:
    """GET o POST JSON con límites duros de timeout y tamaño."""

    cabeceras = {
        "User-Agent": settings.FUENTES_ABIERTAS_USER_AGENT,
        "Accept": "application/json",
    }
    ruta_socket = _ruta_socket_proxy()
    if ruta_socket:
        crudo = _descargar_por_socket(ruta_socket, url, params, datos, cabeceras)
    else:
        if datos is not None:
            cuerpo = urlencode(datos).encode("utf-8")
            peticion = Request(url, data=cuerpo, headers=cabeceras, method="POST")
        else:
            separador = "&" if "?" in url else "?"
            peticion = Request(
                url + separador + urlencode(params or {}),
                headers=cabeceras,
                method="GET",
            )
        try:
            with _opener_para_fuentes().open(  # noqa: S310 - URL fija de settings
                peticion, timeout=settings.FUENTES_ABIERTAS_TIMEOUT_SECONDS
            ) as respuesta:
                crudo = respuesta.read(settings.FUENTES_ABIERTAS_MAX_BYTES + 1)
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            raise ConnectionError(f"No se pudo contactar a la fuente: {exc}") from exc
    return _parsear_json(crudo)


def _categoria_por_tags(tags: dict[str, str]) -> str:
    for clave in ("tourism", "amenity", "shop", "historic", "leisure", "natural"):
        categoria = CATEGORIAS_POR_TAG.get(tags.get(clave, "").lower(), "")
        if categoria:
            return categoria
    return ""


def _categoria_por_texto(texto: str) -> str:
    normalizado = _sin_tildes(texto).lower()
    for palabras, categoria in CATEGORIAS_POR_PALABRA:
        if any(palabra in normalizado for palabra in palabras):
            return categoria
    return ""


def _direccion_overpass(tags: dict[str, str]) -> str:
    calle = tags.get("addr:street", "").strip()
    numero = tags.get("addr:housenumber", "").strip()
    return " ".join(parte for parte in (calle, numero) if parte)[:300]


def buscar_en_overpass(
    termino: str,
    *,
    ciudad: str = "La Paz",
    limite: int = 20,
) -> list[CandidatoLugar]:
    """Busca por etiqueta OSM y nombre dentro del bounding box de la ciudad."""

    _, bbox = validar_ciudad(ciudad)
    termino = validar_termino(termino)
    limite = validar_limite(limite)
    consulta = _consulta_overpass(termino, ciudad, bbox, limite)
    _esperar_turno("overpass")

    respuesta: dict | None = None
    ultimo_error: Exception | None = None
    reintentos = getattr(settings, "FUENTES_ABIERTAS_REINTENTOS_OVERPASS", 0) + 1
    for url in _urls_overpass():
        for intento in range(reintentos):
            try:
                respuesta = _descargar_json(url, datos={"data": consulta})
                break
            except (ConnectionError, ValueError) as exc:
                ultimo_error = exc
                if intento + 1 < reintentos:
                    time.sleep(1)
        if respuesta is not None:
            break
    if respuesta is None:
        raise FuenteAbiertaError(
            "overpass",
            f"No se pudo consultar ningún espejo de Overpass: {ultimo_error}",
        ) from ultimo_error

    candidatos: list[CandidatoLugar] = []
    vistos: set[tuple[str, str]] = set()
    for elemento in respuesta.get("elements", []):
        tipo = elemento.get("type", "")
        identificador = elemento.get("id")
        if tipo not in {"node", "way", "relation"} or identificador is None:
            continue
        clave = (f"{tipo}/{identificador}", "overpass")
        if clave in vistos:
            continue
        vistos.add(clave)
        tags = elemento.get("tags") or {}
        nombre = (tags.get("name:es") or tags.get("name") or "").strip()
        if not nombre:
            continue
        centro = elemento.get("center") or {}
        latitud = elemento.get("lat", centro.get("lat"))
        longitud = elemento.get("lon", centro.get("lon"))
        id_externo = f"{tipo}/{identificador}"
        candidatos.append(
            CandidatoLugar(
                fuente="overpass",
                id_externo=id_externo,
                nombre=nombre[:200],
                descripcion=(
                    tags.get("description:es") or tags.get("description") or ""
                ).strip(),
                categoria_sugerida=_categoria_por_tags(tags),
                latitud=float(latitud) if latitud is not None else None,
                longitud=float(longitud) if longitud is not None else None,
                direccion=_direccion_overpass(tags),
                horario_declarado=tags.get("opening_hours", "").strip()[:200],
                sitio_web=(tags.get("website") or tags.get("contact:website") or "").strip()[
                    :500
                ],
                url_fuente=f"https://www.openstreetmap.org/{id_externo}",
                licencia=LICENCIA_OVERPASS,
            )
        )
        if len(candidatos) >= limite:
            break
    return candidatos


def _coordenada_wikidata(claims: dict) -> tuple[float | None, float | None]:
    for reclamo in claims.get("P625", []):
        valor = (reclamo.get("mainsnak") or {}).get("datavalue", {}).get("value", {})
        if "latitude" in valor and "longitude" in valor:
            return float(valor["latitude"]), float(valor["longitude"])
    return None, None


def _sitio_web_wikidata(claims: dict) -> str:
    for reclamo in claims.get("P856", []):
        valor = (reclamo.get("mainsnak") or {}).get("datavalue", {}).get("value", "")
        if isinstance(valor, str) and valor.startswith(("http://", "https://")):
            return valor[:500]
    return ""


def buscar_en_wikidata(
    termino: str,
    *,
    ciudad: str = "La Paz",
    limite: int = 20,
) -> list[CandidatoLugar]:
    """Busca entidades con coordenadas dentro del bounding box de la ciudad."""

    _, (sur, oeste, norte, este) = validar_ciudad(ciudad)
    termino = validar_termino(termino)
    limite = validar_limite(limite)
    maximo = min(limite, 20)

    _esperar_turno("wikidata")
    try:
        busqueda = _descargar_json(
            settings.FUENTES_ABIERTAS_WIKIDATA_URL,
            params={
                "action": "wbsearchentities",
                "format": "json",
                "language": "es",
                "uselang": "es",
                "type": "item",
                "limit": maximo,
                "search": termino,
            },
        )
        identificadores = [
            item["id"] for item in busqueda.get("search", []) if item.get("id")
        ]
        if not identificadores:
            return []
        entidades = _descargar_json(
            settings.FUENTES_ABIERTAS_WIKIDATA_URL,
            params={
                "action": "wbgetentities",
                "format": "json",
                "languages": "es|en",
                "props": "claims|descriptions|labels",
                "ids": "|".join(identificadores),
            },
        ).get("entities", {})
    except (ConnectionError, ValueError) as exc:
        raise FuenteAbiertaError("wikidata", str(exc)) from exc

    descripciones_busqueda = {
        item["id"]: (item.get("description") or "")
        for item in busqueda.get("search", [])
        if item.get("id")
    }
    candidatos: list[CandidatoLugar] = []
    for identificador in identificadores:
        entidad = entidades.get(identificador) or {}
        latitud, longitud = _coordenada_wikidata(entidad.get("claims") or {})
        if latitud is None or longitud is None:
            continue
        if not (sur <= latitud <= norte and oeste <= longitud <= este):
            continue
        descripcion = (
            (entidad.get("descriptions") or {})
            .get("es", {})
            .get("value", "")
            or descripciones_busqueda.get(identificador, "")
        ).strip()
        nombre = (
            (entidad.get("labels") or {}).get("es", {}).get("value", "")
            or descripciones_busqueda.get(identificador, "")
            or identificador
        ).strip()
        candidatos.append(
            CandidatoLugar(
                fuente="wikidata",
                id_externo=identificador,
                nombre=nombre[:200],
                descripcion=descripcion,
                categoria_sugerida=_categoria_por_texto(descripcion),
                latitud=latitud,
                longitud=longitud,
                sitio_web=_sitio_web_wikidata(entidad.get("claims") or {}),
                url_fuente=f"https://www.wikidata.org/wiki/{identificador}",
                licencia=LICENCIA_WIKIDATA,
            )
        )
        if len(candidatos) >= limite:
            break
    return candidatos


def buscar_lugares(
    termino: str,
    *,
    ciudad: str = "La Paz",
    fuentes=("*",),
    limite: int = 20,
) -> tuple[list[CandidatoLugar], dict[str, str]]:
    """Busca en varias fuentes; un fallo parcial no descarta las demás.

    Devuelve ``(candidatos, errores_por_fuente)``. Los errores se guardan en
    la importación para que la UI pueda explicar por qué faltó una fuente.
    """

    validar_termino(termino)
    validar_ciudad(ciudad)
    limite = validar_limite(limite)
    seleccionadas = tuple(fuentes) if fuentes != ("*",) else FUENTES_DISPONIBLES
    desconocidas = [f for f in seleccionadas if f not in FUENTES_DISPONIBLES]
    if desconocidas:
        raise ValueError(f"Fuentes no soportadas: {', '.join(desconocidas)}.")

    clientes = {
        "overpass": buscar_en_overpass,
        "wikidata": buscar_en_wikidata,
    }
    candidatos: list[CandidatoLugar] = []
    errores: dict[str, str] = {}
    vistos: set[tuple[str, str]] = set()
    for fuente in seleccionadas:
        try:
            resultados = clientes[fuente](termino, ciudad=ciudad, limite=limite)
        except FuenteAbiertaError as exc:
            errores[fuente] = str(exc)
            continue
        for candidato in resultados:
            clave = (candidato.fuente, candidato.id_externo)
            if clave in vistos:
                continue
            vistos.add(clave)
            candidatos.append(candidato)
    return candidatos, errores
