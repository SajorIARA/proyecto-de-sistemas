import uuid

from django.conf import settings
from django.contrib.gis.db.models.functions import Distance, Transform
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db.models import Avg, Count, Max, Min, Q
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from usuarios.permissions import IsAdmin, IsAdminOrReadOnly

try:
    from cloudinary.utils import api_sign_request
except ImportError:  # pragma: no cover - SDK ausente: firma degradada a 503
    api_sign_request = None

from .models import Atractivo, Categoria, Foto, Horario, Tarifa, TipoTarifa
from .serializers import (
    AtractivoAdminSerializer,
    AtractivoSerializer,
    CategoriaSerializer,
    FotoSerializer,
    HorarioSerializer,
    TarifaSerializer,
    TipoTarifaSerializer,
)


class CategoriaViewSet(ModelViewSet):
    """CRUD categorías. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = CategoriaSerializer
    queryset = Categoria.objects.all().order_by("nombre")

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action in ("list", "retrieve"):
            return queryset.filter(activo=True)

        return queryset

    def perform_destroy(self, instance):
        """Da de baja la categoría sin eliminarla físicamente."""
        instance.activo = False
        instance.save(update_fields=["activo"])


class TipoTarifaViewSet(ModelViewSet):
    """CRUD tipos de tarifa. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = TipoTarifaSerializer
    queryset = TipoTarifa.objects.all().order_by("nombre")


class HorarioViewSet(ModelViewSet):
    """CRUD horarios. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = HorarioSerializer
    queryset = Horario.objects.select_related("atractivo").all()


class TarifaViewSet(ModelViewSet):
    """CRUD tarifas. Lectura pública, escritura solo ADMIN."""

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = TarifaSerializer
    queryset = Tarifa.objects.select_related("atractivo", "tipo_tarifa").all()


class AtractivoViewSet(ReadOnlyModelViewSet):
    """Catálogo público de atractivos (solo lectura).

    Filtros combinables (issue #18, pensados para buscador con debounce):
    q (nombre/descripción/dirección), categoria (nombre o id, repetible o
    coma-separado), zona (texto en dirección), precio_min/precio_max
    (BOB, sobre tarifas). Ej:
    ``/api/turismo/atractivos/?q=museo&categoria=Cultura&precio_max=50``.
    """

    permission_classes = [AllowAny]
    serializer_class = AtractivoSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "q",
                str,
                OpenApiParameter.QUERY,
                required=False,
                description="Texto en nombre, descripción o dirección.",
            ),
            OpenApiParameter(
                "categoria",
                str,
                OpenApiParameter.QUERY,
                required=False,
                description="Nombre o id de categoría (repetible o coma-separado).",
            ),
            OpenApiParameter(
                "zona",
                str,
                OpenApiParameter.QUERY,
                required=False,
                description="Texto libre sobre la dirección (ej. Mallasa).",
            ),
            OpenApiParameter(
                "precio_min",
                float,
                OpenApiParameter.QUERY,
                required=False,
                description="Tarifa mínima en BOB.",
            ),
            OpenApiParameter(
                "precio_max",
                float,
                OpenApiParameter.QUERY,
                required=False,
                description="Tarifa máxima en BOB.",
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = (
            Atractivo.objects.filter(activo=True)
            .prefetch_related("categorias", "fotos")
            .order_by("nombre")
        )
        params = self.request.query_params
        query = params.get("q")
        if query:
            queryset = queryset.filter(
                Q(nombre__icontains=query)
                | Q(descripcion__icontains=query)
                | Q(direccion__icontains=query)
            )
        categorias = params.getlist("categoria")
        if len(categorias) == 1 and "," in categorias[0]:
            categorias = [c.strip() for c in categorias[0].split(",")]
        categorias = [c for c in categorias if c]
        if categorias:
            por_id = [c for c in categorias if c.isdigit()]
            por_nombre = [c for c in categorias if not c.isdigit()]
            filtro_categoria = Q()
            if por_id:
                filtro_categoria |= Q(categorias__id_categoria__in=por_id)
            if por_nombre:
                filtro_categoria |= Q(categorias__nombre__in=por_nombre)
            queryset = queryset.filter(filtro_categoria)
        zona = params.get("zona")
        if zona:
            queryset = queryset.filter(direccion__icontains=zona)
        try:
            precio_min = float(params["precio_min"]) if "precio_min" in params else None
            precio_max = float(params["precio_max"]) if "precio_max" in params else None
        except (TypeError, ValueError):
            raise ValidationError(
                {"detail": "precio_min y precio_max deben ser numéricos (BOB)."}
            )
        if precio_min is not None:
            queryset = queryset.filter(tarifas__monto__gte=precio_min)
        if precio_max is not None:
            queryset = queryset.filter(tarifas__monto__lte=precio_max)
        return queryset.distinct()

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "lat",
                float,
                OpenApiParameter.QUERY,
                required=True,
                description="Latitud del punto de referencia.",
            ),
            OpenApiParameter(
                "lon",
                float,
                OpenApiParameter.QUERY,
                required=True,
                description="Longitud del punto de referencia.",
            ),
            OpenApiParameter(
                "radio",
                float,
                OpenApiParameter.QUERY,
                required=False,
                description="Radio en metros (defecto 2000, máximo 50000).",
            ),
        ],
        description="Atractivos activos dentro del radio, ordenados por "
        "distancia. Cada item incluye distancia_m.",
    )
    @action(detail=False, methods=["get"], url_path="cercanos")
    def cercanos(self, request):
        """GET /api/turismo/atractivos/cercanos/?lat=&lon=&radio= (metros).

        Búsqueda espacial: atractivos activos dentro del radio indicado
        del punto dado, ordenados por distancia ascendente. Cada item
        incluye ``distancia_m``. Distancias calculadas en metros con
        proyección UTM 19S (La Paz).
        """
        try:
            lat = float(request.query_params["lat"])
            lon = float(request.query_params["lon"])
        except (KeyError, TypeError, ValueError):
            return Response({"detail": "Se requieren lat y lon numéricos."}, status=400)
        if not -90 <= lat <= 90 or not -180 <= lon <= 180:
            return Response(
                {"detail": "lat debe estar en [-90, 90] y lon en [-180, 180]."},
                status=400,
            )
        try:
            radio = float(request.query_params.get("radio", 2000))
        except (TypeError, ValueError):
            return Response({"detail": "radio debe ser numérico (metros)."}, status=400)
        if not 0 < radio <= 50000:
            return Response(
                {"detail": "radio debe estar en (0, 50000] metros."}, status=400
            )
        punto = Point(lon, lat, srid=4326)
        punto_utm = punto.transform(32719, clone=True)
        queryset = (
            Atractivo.objects.filter(activo=True)
            .prefetch_related("categorias", "fotos")
            .annotate(distancia=Distance(Transform("ubicacion", 32719), punto_utm))
            .filter(distancia__lte=D(m=radio))
            .order_by("distancia")
        )
        pagina = self.paginate_queryset(queryset)
        if pagina is not None:
            datos = self.get_serializer(pagina, many=True).data
            for item, obj in zip(datos, pagina):
                item["distancia_m"] = round(obj.distancia.m, 1)
            return self.get_paginated_response(datos)
        datos = self.get_serializer(queryset, many=True).data
        for item, obj in zip(datos, queryset):
            item["distancia_m"] = round(obj.distancia.m, 1)
        return Response(datos)

    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Facetas para el panel de filtros: categorías con "
        "conteo de atractivos activos y rango de precios BOB.",
    )
    @action(detail=False, methods=["get"], url_path="facetas")
    def facetas(self, request):
        """GET /api/turismo/atractivos/facetas/ — opciones del panel."""
        activos = Atractivo.objects.filter(activo=True)
        categorias = list(
            Categoria.objects.filter(atractivos__activo=True)
            .annotate(total=Count("atractivos"))
            .order_by("nombre")
            .values("id_categoria", "nombre", "total")
        )
        precios = Tarifa.objects.filter(atractivo__activo=True).aggregate(
            min=Min("monto"), max=Max("monto"), promedio=Avg("monto")
        )
        return Response(
            {
                "total_atractivos": activos.count(),
                "categorias": categorias,
                "precios_bob": {
                    "min": precios["min"],
                    "max": precios["max"],
                    "promedio": precios["promedio"],
                },
            }
        )


class AtractivoAdminViewSet(ModelViewSet):
    """CRUD de destinos turísticos. Solo usuarios con rol ADMIN.

    Endpoints (bajo /api/turismo/admin/atractivos/):
    POST crear · GET listar/detalle · PUT/PATCH actualizar ·
    DELETE baja lógica (activo=false, preserva relacionados).
    Las coordenadas se reciben como {longitud, latitud} y se persisten
    como Point SRID 4326 en PostGIS.
    """

    permission_classes = [IsAdmin]
    serializer_class = AtractivoAdminSerializer
    queryset = (
        Atractivo.objects.prefetch_related("categorias", "fotos")
        .all()
        .order_by("nombre")
    )

    def perform_destroy(self, instance: Atractivo) -> None:
        """Baja lógica (issue #20): marca inactivo en vez de borrar.

        Preserva horarios, tarifas y fuentes relacionadas (FK CASCADE /
        SET NULL no se disparan) y mantiene el historial del destino.
        """
        instance.activo = False
        instance.save(update_fields=["activo", "fecha_actualizacion"])


FORMATOS_FOTO = ("jpg", "jpeg", "png", "webp")
MAX_BYTES_FOTO = 10 * 1024 * 1024


class FotoAdminViewSet(ModelViewSet):
    """CRUD de fotos de destinos. Solo ADMIN."""

    permission_classes = [IsAdmin]
    serializer_class = FotoSerializer
    queryset = (
        Foto.objects.select_related("atractivo")
        .all()
        .order_by("atractivo", "orden", "id_foto")
    )


class FirmaFotoView(APIView):
    """POST /api/turismo/admin/fotos/firma/ — firma subida directa.

    El frontend sube el archivo directo a Cloudinary con estos
    parámetros (el API secret nunca sale del backend). 503 si
    Cloudinary no está configurado.
    """

    permission_classes = [IsAdmin]

    @extend_schema(
        request={
            "type": "object",
            "properties": {
                "atractivo": {"type": "string", "format": "uuid"},
                "formato": {"type": "string", "enum": list(FORMATOS_FOTO)},
                "bytes": {"type": "integer", "minimum": 1},
            },
            "required": ["atractivo", "formato", "bytes"],
        },
        responses={200: OpenApiTypes.OBJECT},
        description="Firma una subida directa a Cloudinary.",
    )
    def post(self, request):
        atractivo_id = request.data.get("atractivo")
        formato = str(request.data.get("formato", "")).lower().lstrip(".")
        try:
            peso = int(request.data.get("bytes", 0))
        except (TypeError, ValueError):
            peso = 0
        if not Atractivo.objects.filter(pk=atractivo_id).exists():
            return Response(
                {"detail": "Atractivo inexistente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if formato not in FORMATOS_FOTO:
            return Response(
                {"detail": f"formato debe ser uno de {list(FORMATOS_FOTO)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not 0 < peso <= MAX_BYTES_FOTO:
            return Response(
                {"detail": "bytes debe estar en (0, 10MB]."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cloud_name = settings.CLOUDINARY.get("cloud_name")
        api_key = settings.CLOUDINARY.get("api_key")
        api_secret = settings.CLOUDINARY.get("api_secret")
        if not (cloud_name and api_key and api_secret) or api_sign_request is None:
            return Response(
                {"detail": "Cloudinary no configurado."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        import time

        timestamp = int(time.time())
        params = {
            "timestamp": timestamp,
            "folder": f"turismo/{atractivo_id}",
            "allowed_formats": ",".join(FORMATOS_FOTO),
            "max_bytes": MAX_BYTES_FOTO,
        }
        firma = api_sign_request(params, api_secret)
        return Response(
            {
                "cloud_name": cloud_name,
                "api_key": api_key,
                "signature": firma,
                "timestamp": timestamp,
                "folder": params["folder"],
                "allowed_formats": list(FORMATOS_FOTO),
            }
        )


EXTENSIONES_IMAGEN = ("jpg", "jpeg", "png", "webp")
EXTENSIONES_VIDEO = ("mp4", "mov", "webm")


class SubirFotoView(APIView):
    """POST /api/turismo/admin/fotos/subir/ (multipart) — flujo async.

    Recibe {atractivo, archivo, tipo, orden}, guarda el temporal en
    staging compartido, crea la Foto en pending y encola la subida.
    Responde 202 inmediato; el avance se consulta en estado/.
    """

    permission_classes = [IsAdmin]

    @extend_schema(
        request={
            "type": "object",
            "properties": {
                "atractivo": {"type": "string", "format": "uuid"},
                "tipo": {"type": "string", "enum": ["imagen", "video"]},
                "orden": {"type": "integer", "minimum": 0},
            },
            "required": ["atractivo"],
        },
        responses={202: OpenApiTypes.OBJECT},
        description="Recibe el archivo y encola la subida a Cloudinary.",
    )
    def post(self, request):
        from .tasks import (
            MAX_BYTES_IMAGEN,
            MAX_BYTES_VIDEO,
            _staging,
            nombre_temporal,
            subir_foto_task,
        )

        try:
            atractivo = Atractivo.objects.get(pk=request.data.get("atractivo"))
        except (Atractivo.DoesNotExist, ValueError, TypeError):
            return Response(
                {"detail": "Atractivo inexistente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tipo = request.data.get("tipo", Foto.TIPO_IMAGEN)
        if tipo not in (Foto.TIPO_IMAGEN, Foto.TIPO_VIDEO):
            return Response(
                {"detail": "tipo debe ser imagen o video."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        archivo = request.FILES.get("archivo")
        if archivo is None:
            return Response(
                {"detail": "Falta el archivo (campo archivo)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        permitidas = (
            EXTENSIONES_VIDEO if tipo == Foto.TIPO_VIDEO else EXTENSIONES_IMAGEN
        )
        # Allowlist de pertenencia para el contrato (400); el temporal
        # usa extensión fija por tipo (nunca la del usuario): cierra path
        # traversal por construcción, no solo por validación.
        extension_pedida = (
            archivo.name.rsplit(".", 1)[-1] if "." in archivo.name else ""
        ).lower()
        maximo = MAX_BYTES_VIDEO if tipo == Foto.TIPO_VIDEO else MAX_BYTES_IMAGEN
        if extension_pedida not in permitidas:
            return Response(
                {"detail": f"Extensión no permitida para {tipo}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        extension = "mp4" if tipo == Foto.TIPO_VIDEO else "jpg"
        if archivo.size is not None and archivo.size > maximo:
            return Response(
                {"detail": f"Archivo supera el máximo ({maximo} bytes)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        foto = Foto.objects.create(
            atractivo=atractivo,
            public_id=f"turismo/pending/{uuid.uuid4().hex}",
            tipo=tipo,
            estado=Foto.ESTADO_PENDING,
            orden=int(request.data.get("orden", 0) or 0),
        )
        destino = _staging() / nombre_temporal(foto.id_foto, extension)
        with open(destino, "wb") as salida:
            for parte in archivo.chunks():
                salida.write(parte)
        subir_foto_task.delay(foto.id_foto, destino.name)
        return Response(
            {"id_foto": foto.id_foto, "estado": foto.estado},
            status=status.HTTP_202_ACCEPTED,
        )


class EstadoFotoView(APIView):
    """GET /api/turismo/admin/fotos/<id>/estado/ — avance de la subida."""

    permission_classes = [IsAdmin]

    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Estado pending/processing/completed/failed de la foto.",
    )
    def get(self, request, pk: int):
        try:
            foto = Foto.objects.get(pk=pk)
        except (Foto.DoesNotExist, ValueError, TypeError):
            return Response(
                {"detail": "Foto inexistente."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "id_foto": foto.id_foto,
                "estado": foto.estado,
                "tipo": foto.tipo,
                "url": foto.url or None,
                "public_id": foto.public_id,
            }
        )
