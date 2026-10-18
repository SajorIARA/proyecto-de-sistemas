"""Medios (solo ADMIN): firma de subida directa, subida async y estado."""

import uuid

from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.permissions import IsAdmin

from .models import Atractivo, Foto
from .serializers import SubirFotoSerializer

try:
    from cloudinary.utils import api_sign_request
except ImportError:  # pragma: no cover - SDK ausente: firma degradada a 503
    api_sign_request = None

FORMATOS_FOTO = ("jpg", "jpeg", "png", "webp")
MAX_BYTES_FOTO = 10 * 1024 * 1024

EXTENSIONES_IMAGEN = ("jpg", "jpeg", "png", "webp")
EXTENSIONES_VIDEO = ("mp4", "mov", "webm")


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
        # Solo parámetros que el frontend reenvía tal cual en el upload;
        # todo lo firmado debe enviarse o Cloudinary rechaza la firma.
        params = {
            "timestamp": timestamp,
            "folder": f"turismo/{atractivo_id}",
            "allowed_formats": ",".join(FORMATOS_FOTO),
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


class SubirFotoView(APIView):
    """POST /api/turismo/admin/fotos/subir/ (multipart) — flujo async.

    Recibe {atractivo, archivo, tipo, orden}, guarda el temporal en
    staging compartido, crea la Foto en pending y encola la subida.
    Responde 202 inmediato; el avance se consulta en estado/.
    """

    permission_classes = [IsAdmin]

    @extend_schema(
        request=SubirFotoSerializer,
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

        entrada = SubirFotoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data
        try:
            atractivo = Atractivo.objects.get(pk=datos["atractivo"])
        except Atractivo.DoesNotExist:
            return Response(
                {"detail": "Atractivo inexistente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tipo = datos["tipo"]
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
            orden=datos["orden"],
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
