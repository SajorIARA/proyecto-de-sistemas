"""Seed unificado (mock/test).

Todo es idempotente (update_or_create / get_or_create).
Los únicos usuarios son un ADMIN y un TOURIST demo.
"""

from __future__ import annotations

from datetime import time
from decimal import Decimal

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand
from django.db import transaction

from conocimiento.models import FuenteDocumental
from recomendaciones.models import ConsultaRecomendacion, UsuarioPreferencia
from turismo.models import (
    Atractivo,
    Categoria,
    Foto,
    Horario,
    Tarifa,
    TipoTarifa,
)
from usuarios.models import Rol, Usuario

USUARIOS = [
    ("siar.admin@turismo.bo", "Siar Admin", "TurismoLP.2026*", Rol.Codes.ADMIN),
    ("demo.turista@example.com", "Turista Demo", "demo1234!", Rol.Codes.TOURIST),
]


CATEGORIAS = [
    ("Arqueología", "Sitios y espacios de interés arqueológico"),
    ("Aventura", "Actividades y experiencias de aventura"),
    ("Cultura", "Atractivos históricos, artísticos y culturales"),
    ("Gastronomía", "Espacios gastronómicos, mercados y cocina local"),
    ("Miradores", "Miradores panorámicos de la ciudad"),
    ("Naturaleza", "Atractivos naturales y paisajísticos"),
]


TIPOS_TARIFA = [
    ("ADULTO_MAYOR", "Adulto mayor", "Tarifa reducida para adultos mayores"),
    ("ESTUDIANTE", "Estudiante", "Tarifa reducida para estudiantes"),
    ("GENERAL", "General", "Tarifa general de ingreso"),
    ("NINO", "Niño", "Tarifa reducida para niños"),
]


ATRACTIVOS = [
    {
        "nombre": "Basílica de San Francisco",
        "descripcion": "Iglesia y museo religioso colonial en pleno centro de La Paz.",
        "url": None,
        "direccion": "Plaza San Francisco",
        "duracion_minutos": 60,
        "lon": -68.1385,
        "lat": -16.4945,
        "fuente_origen": "INSTITUCIONAL",
        "categorias": ["Cultura"],
        "horarios": [
            (1, "09:00:00", "18:00:00", False),
            (2, "09:00:00", "18:00:00", False),
            (3, "09:00:00", "18:00:00", False),
            (4, "09:00:00", "18:00:00", False),
            (5, "09:00:00", "18:00:00", False),
            (6, "09:00:00", "18:00:00", False),
            (7, "09:00:00", "18:00:00", False),
        ],
        "tarifas": [("GENERAL", "5.00", "BOB")],
        "fotos": [
            (
                "turismo/4aae7f31-fe00-49b0-9ff9-e790dbe9c942/nglzzsswhk03d4x9onvf",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660102/turismo/4aae7f31-fe00-49b0-9ff9-e790dbe9c942/nglzzsswhk03d4x9onvf.jpg",
                1200,
                1600,
                1,
                "imagen",
            ),
            (
                "turismo/4aae7f31-fe00-49b0-9ff9-e790dbe9c942/gagbqleer0wfgg9o32gi",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660211/turismo/4aae7f31-fe00-49b0-9ff9-e790dbe9c942/gagbqleer0wfgg9o32gi.jpg",
                678,
                452,
                2,
                "imagen",
            ),
            (
                "turismo/4aae7f31-fe00-49b0-9ff9-e790dbe9c942/lyatjm18ogs0ibbb07hl",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660211/turismo/4aae7f31-fe00-49b0-9ff9-e790dbe9c942/lyatjm18ogs0ibbb07hl.jpg",
                425,
                639,
                3,
                "imagen",
            ),
        ],
        "fuentes": [("Reseña de Basílica de San Francisco", "guia")],
    },
    {
        "nombre": "Mercado de las Brujas",
        "descripcion": "Callejón de artesanías, hierbas y objetos tradicionales.",
        "url": None,
        "direccion": "Calle Linares y alrededores",
        "duracion_minutos": 90,
        "lon": -68.1408,
        "lat": -16.4977,
        "fuente_origen": "SCRAPING",
        "categorias": ["Cultura", "Gastronomía"],
        "horarios": [
            (1, "09:00:00", "19:00:00", False),
            (2, "09:00:00", "19:00:00", False),
            (3, "09:00:00", "19:00:00", False),
            (4, "09:00:00", "19:00:00", False),
            (5, "09:00:00", "19:00:00", False),
            (6, "09:00:00", "19:00:00", False),
            (7, "09:00:00", "19:00:00", False),
        ],
        "tarifas": [],
        "fotos": [
            (
                "turismo/027f1e8d-47b4-4cdb-b8b2-fabf88fe50cd/yud93g3npv33qcshjdbi",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660276/turismo/027f1e8d-47b4-4cdb-b8b2-fabf88fe50cd/yud93g3npv33qcshjdbi.jpg",
                678,
                452,
                0,
                "imagen",
            ),
            (
                "turismo/027f1e8d-47b4-4cdb-b8b2-fabf88fe50cd/zcjpuqftkaubchftqgte",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660276/turismo/027f1e8d-47b4-4cdb-b8b2-fabf88fe50cd/zcjpuqftkaubchftqgte.jpg",
                738,
                414,
                1,
                "imagen",
            ),
            (
                "turismo/027f1e8d-47b4-4cdb-b8b2-fabf88fe50cd/qhvjc7zzz6zdyy2tzpyi",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660277/turismo/027f1e8d-47b4-4cdb-b8b2-fabf88fe50cd/qhvjc7zzz6zdyy2tzpyi.jpg",
                480,
                638,
                2,
                "imagen",
            ),
        ],
        "fuentes": [("Reseña de Mercado de las Brujas", "guia")],
    },
    {
        "nombre": "Mirador Killi Killi",
        "descripcion": "Mirador natural con vista panorámica del centro de La Paz.",
        "url": None,
        "direccion": "Av. Killakillas",
        "duracion_minutos": 60,
        "lon": -68.1276,
        "lat": -16.4897,
        "fuente_origen": "INSTITUCIONAL",
        "categorias": ["Miradores"],
        "horarios": [
            (1, "08:00:00", "20:00:00", False),
            (2, "08:00:00", "20:00:00", False),
            (3, "08:00:00", "20:00:00", False),
            (4, "08:00:00", "20:00:00", False),
            (5, "08:00:00", "20:00:00", False),
            (6, "08:00:00", "20:00:00", False),
            (7, "08:00:00", "20:00:00", False),
        ],
        "tarifas": [],
        "fotos": [
            (
                "turismo/5de74683-b470-49b7-820f-31f9ce55cbfa/vvwg6hlfk00mollnte3w",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660513/turismo/5de74683-b470-49b7-820f-31f9ce55cbfa/vvwg6hlfk00mollnte3w.jpg",
                600,
                400,
                0,
                "imagen",
            ),
            (
                "turismo/5de74683-b470-49b7-820f-31f9ce55cbfa/geq1xdeag9otieuv3zx5",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660515/turismo/5de74683-b470-49b7-820f-31f9ce55cbfa/geq1xdeag9otieuv3zx5.jpg",
                660,
                350,
                1,
                "imagen",
            ),
            (
                "turismo/5de74683-b470-49b7-820f-31f9ce55cbfa/q2dgrg5rsqo3goq4cb36",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660515/turismo/5de74683-b470-49b7-820f-31f9ce55cbfa/q2dgrg5rsqo3goq4cb36.png",
                1200,
                719,
                2,
                "imagen",
            ),
        ],
        "fuentes": [("Reseña de Mirador Killi Killi", "guia")],
    },
    {
        "nombre": "Museo de la Calle Jaén",
        "descripcion": "Conjunto de museos coloniales en una de las calles mejor conservadas de la ciudad.",
        "url": None,
        "direccion": "Calle Jaén",
        "duracion_minutos": 90,
        "lon": -68.1386,
        "lat": -16.494,
        "fuente_origen": "INSTITUCIONAL",
        "categorias": ["Cultura"],
        "horarios": [
            (1, None, None, True),
            (2, "09:00:00", "18:00:00", False),
            (3, "09:00:00", "18:00:00", False),
            (4, "09:00:00", "18:00:00", False),
            (5, "09:00:00", "18:00:00", False),
            (6, "09:00:00", "18:00:00", False),
            (7, "09:00:00", "18:00:00", False),
        ],
        "tarifas": [
            ("GENERAL", "20.00", "BOB"),
            ("NINO", "5.00", "BOB"),
            ("ESTUDIANTE", "7.00", "BOB"),
            ("ADULTO_MAYOR", "0.00", "BOB"),
        ],
        "fotos": [
            (
                "turismo/cecdefdc-7233-43e9-a440-3240aa75b386/vwngdrmsdyypd5i4s1ru",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660646/turismo/cecdefdc-7233-43e9-a440-3240aa75b386/vwngdrmsdyypd5i4s1ru.jpg",
                494,
                619,
                0,
                "imagen",
            ),
            (
                "turismo/cecdefdc-7233-43e9-a440-3240aa75b386/qwlbedkqt1y6htciprwf",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660647/turismo/cecdefdc-7233-43e9-a440-3240aa75b386/qwlbedkqt1y6htciprwf.jpg",
                580,
                344,
                1,
                "imagen",
            ),
            (
                "turismo/cecdefdc-7233-43e9-a440-3240aa75b386/sppkgl94e08py0uk9a40",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660647/turismo/cecdefdc-7233-43e9-a440-3240aa75b386/sppkgl94e08py0uk9a40.jpg",
                365,
                547,
                2,
                "imagen",
            ),
        ],
        "fuentes": [("Reseña de Museo de la Calle Jaén", "guia")],
    },
    {
        "nombre": "Parque Urbano Central",
        "descripcion": "Parque urbano con áreas verdes, juegos y espacio para eventos.",
        "url": None,
        "direccion": "Av. Simón Bolívar",
        "duracion_minutos": 90,
        "lon": -68.1266,
        "lat": -16.4993,
        "fuente_origen": "INSTITUCIONAL",
        "categorias": ["Naturaleza"],
        "horarios": [
            (1, "06:00:00", "21:00:00", False),
            (2, "06:00:00", "21:00:00", False),
            (3, "06:00:00", "21:00:00", False),
            (4, "06:00:00", "21:00:00", False),
            (5, "06:00:00", "21:00:00", False),
            (6, "06:00:00", "21:00:00", False),
            (7, "06:00:00", "21:00:00", False),
        ],
        "tarifas": [],
        "fotos": [
            (
                "turismo/c58658b6-7d98-4c9c-9002-6ddbf2dfd1ba/nboianlsvhviuz1ub8be",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660773/turismo/c58658b6-7d98-4c9c-9002-6ddbf2dfd1ba/nboianlsvhviuz1ub8be.jpg",
                554,
                554,
                0,
                "imagen",
            ),
            (
                "turismo/c58658b6-7d98-4c9c-9002-6ddbf2dfd1ba/nlys0rcp2dioo6juhtxo",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660774/turismo/c58658b6-7d98-4c9c-9002-6ddbf2dfd1ba/nlys0rcp2dioo6juhtxo.jpg",
                447,
                447,
                1,
                "imagen",
            ),
            (
                "turismo/c58658b6-7d98-4c9c-9002-6ddbf2dfd1ba/pon83rvr0ytxtlgnx0d7",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660774/turismo/c58658b6-7d98-4c9c-9002-6ddbf2dfd1ba/pon83rvr0ytxtlgnx0d7.jpg",
                960,
                576,
                2,
                "imagen",
            ),
        ],
        "fuentes": [("Reseña de Parque Urbano Central", "guia")],
    },
    {
        "nombre": "Plaza Murillo",
        "descripcion": "Plaza principal de la ciudad, sede del poder político del país.",
        "url": None,
        "direccion": "Calle Comercio y Ayacucho",
        "duracion_minutos": 45,
        "lon": -68.1375,
        "lat": -16.4961,
        "fuente_origen": "INSTITUCIONAL",
        "categorias": ["Cultura"],
        "horarios": [
            (1, "08:00:00", "20:00:00", False),
            (2, "08:00:00", "20:00:00", False),
            (3, "08:00:00", "20:00:00", False),
            (4, "08:00:00", "20:00:00", False),
            (5, "08:00:00", "20:00:00", False),
            (6, "08:00:00", "20:00:00", False),
            (7, "08:00:00", "20:00:00", False),
        ],
        "tarifas": [],
        "fotos": [
            (
                "turismo/80fbe0b6-d10f-4d5b-acac-1706d39f221c/wegkqnnqsbz9j4ufdlfv",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660899/turismo/80fbe0b6-d10f-4d5b-acac-1706d39f221c/wegkqnnqsbz9j4ufdlfv.jpg",
                960,
                720,
                0,
                "imagen",
            ),
            (
                "turismo/80fbe0b6-d10f-4d5b-acac-1706d39f221c/ujqlgrlckft7fpytqyq6",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660900/turismo/80fbe0b6-d10f-4d5b-acac-1706d39f221c/ujqlgrlckft7fpytqyq6.jpg",
                1024,
                681,
                1,
                "imagen",
            ),
            (
                "turismo/80fbe0b6-d10f-4d5b-acac-1706d39f221c/sh8eoqisdovvzif5bdi1",
                "https://res.cloudinary.com/turismopro/image/upload/v1791660901/turismo/80fbe0b6-d10f-4d5b-acac-1706d39f221c/sh8eoqisdovvzif5bdi1.jpg",
                640,
                480,
                2,
                "imagen",
            ),
        ],
        "fuentes": [("Reseña de Plaza Murillo", "guia")],
    },
    {
        "nombre": "Valle de la Luna",
        "descripcion": "Formaciones rocosas naturales modeladas por la erosión, ubicadas al sur de la ciudad.",
        "url": None,
        "direccion": "Av. Valle de la Luna, Mallasa",
        "duracion_minutos": 120,
        "lon": -68.0673,
        "lat": -16.5685,
        "fuente_origen": "INSTITUCIONAL",
        "categorias": ["Naturaleza"],
        "horarios": [
            (1, "09:00:00", "17:00:00", False),
            (2, "09:00:00", "17:00:00", False),
            (3, "09:00:00", "17:00:00", False),
            (4, "09:00:00", "17:00:00", False),
            (5, "09:00:00", "17:00:00", False),
            (6, "09:00:00", "17:00:00", False),
            (7, "09:00:00", "17:00:00", False),
        ],
        "tarifas": [
            ("GENERAL", "30.00", "BOB"),
            ("NINO", "10.00", "BOB"),
            ("ESTUDIANTE", "15.00", "BOB"),
        ],
        "fotos": [
            (
                "turismo/3e33fe8a-841c-4fa7-be7d-6971b24c8412/t7wuiin6cfr9euq2ivrt",
                "https://res.cloudinary.com/turismopro/image/upload/v1791661053/turismo/3e33fe8a-841c-4fa7-be7d-6971b24c8412/t7wuiin6cfr9euq2ivrt.png",
                546,
                366,
                0,
                "imagen",
            ),
            (
                "turismo/3e33fe8a-841c-4fa7-be7d-6971b24c8412/jjeqdjis6buqvlpkff6c",
                "https://res.cloudinary.com/turismopro/image/upload/v1791661058/turismo/3e33fe8a-841c-4fa7-be7d-6971b24c8412/jjeqdjis6buqvlpkff6c.jpg",
                547,
                365,
                1,
                "imagen",
            ),
            (
                "turismo/3e33fe8a-841c-4fa7-be7d-6971b24c8412/hc7jwbp5qmwnqthgp42t",
                "https://res.cloudinary.com/turismopro/image/upload/v1791661059/turismo/3e33fe8a-841c-4fa7-be7d-6971b24c8412/hc7jwbp5qmwnqthgp42t.jpg",
                415,
                739,
                2,
                "imagen",
            ),
        ],
        "fuentes": [("Reseña de Valle de la Luna", "guia")],
    },
    {
        "nombre": "Valle de las Ánimas",
        "descripcion": "Quebradas con formaciones rocosas ideales para senderismo.",
        "url": None,
        "direccion": "Zona Sur, Mallasa",
        "duracion_minutos": 180,
        "lon": -68.056,
        "lat": -16.573,
        "fuente_origen": "FUENTE_OFICIAL",
        "categorias": ["Naturaleza"],
        "horarios": [
            (1, "07:00:00", "18:00:00", False),
            (2, "07:00:00", "18:00:00", False),
            (3, "07:00:00", "18:00:00", False),
            (4, "07:00:00", "18:00:00", False),
            (5, "07:00:00", "18:00:00", False),
            (6, "07:00:00", "18:00:00", False),
            (7, "07:00:00", "18:00:00", False),
        ],
        "tarifas": [],
        "fotos": [
            (
                "turismo/d2d0d47f-8eaf-41cf-861d-5ed4c4c50c08/at1ztkqi69itvug2thiv",
                "https://res.cloudinary.com/turismopro/image/upload/v1791661138/turismo/d2d0d47f-8eaf-41cf-861d-5ed4c4c50c08/at1ztkqi69itvug2thiv.jpg",
                495,
                619,
                0,
                "imagen",
            ),
            (
                "turismo/d2d0d47f-8eaf-41cf-861d-5ed4c4c50c08/tt4q1vu1xs7zgesd0ass",
                "https://res.cloudinary.com/turismopro/image/upload/v1791661143/turismo/d2d0d47f-8eaf-41cf-861d-5ed4c4c50c08/tt4q1vu1xs7zgesd0ass.jpg",
                495,
                619,
                1,
                "imagen",
            ),
            (
                "turismo/d2d0d47f-8eaf-41cf-861d-5ed4c4c50c08/zew4ub4ahgmfvppfydw3",
                "https://res.cloudinary.com/turismopro/image/upload/v1791661143/turismo/d2d0d47f-8eaf-41cf-861d-5ed4c4c50c08/zew4ub4ahgmfvppfydw3.jpg",
                554,
                554,
                2,
                "imagen",
            ),
        ],
        "fuentes": [("Reseña de Valle de las Ánimas", "guia")],
    },
]


class Command(BaseCommand):
    help = "Carga el dataset de prueba (idempotente)."

    @transaction.atomic
    def handle(self, *args, **options):
        self._roles()
        self._usuarios()
        self._categorias()
        self._tipos_tarifa()
        n = self._atractivos()
        self._demo_turista()
        self.stdout.write(self.style.SUCCESS(f"Seed completado: {n} atractivos."))

    def _roles(self):
        for codigo in (Rol.Codes.ADMIN, Rol.Codes.TOURIST):
            Rol.objects.update_or_create(
                codigo=codigo,
                defaults={"nombre": Rol.Codes(codigo).label},
            )

    def _usuarios(self):
        for email, nombre, password, rol in USUARIOS:
            usuario, _ = Usuario.objects.get_or_create(
                email=email, defaults={"nombre": nombre}
            )
            if not usuario.check_password(password):
                usuario.set_password(password)
            usuario.nombre = nombre
            usuario.activo = True
            usuario.save()
            rol_obj, _ = Rol.objects.get_or_create(codigo=rol, defaults={"nombre": rol})
            usuario.roles.add(rol_obj)

    def _categorias(self):
        for nombre, descripcion in CATEGORIAS:
            Categoria.objects.update_or_create(
                nombre=nombre, defaults={"descripcion": descripcion}
            )

    def _tipos_tarifa(self):
        for codigo, nombre, descripcion in TIPOS_TARIFA:
            TipoTarifa.objects.update_or_create(
                codigo=codigo,
                defaults={"nombre": nombre, "descripcion": descripcion},
            )

    def _atractivos(self) -> int:
        for datos in ATRACTIVOS:
            atractivo, _ = Atractivo.objects.update_or_create(
                nombre=datos["nombre"],
                defaults={
                    "descripcion": datos["descripcion"],
                    "url": datos["url"],
                    "direccion": datos["direccion"],
                    "duracion_minutos": datos["duracion_minutos"],
                    "ubicacion": Point(datos["lon"], datos["lat"], srid=4326),
                    "fuente_origen": datos["fuente_origen"],
                    "activo": True,
                },
            )
            atractivo.categorias.set(
                Categoria.objects.filter(nombre__in=datos["categorias"])
            )
            for dia, apertura, cierre, cerrado in datos["horarios"]:
                Horario.objects.update_or_create(
                    atractivo=atractivo,
                    dia_semana=dia,
                    defaults={
                        "hora_apertura": (
                            time.fromisoformat(apertura) if apertura else None
                        ),
                        "hora_cierre": (time.fromisoformat(cierre) if cierre else None),
                        "cerrado": cerrado,
                    },
                )
            atractivo.tarifas.all().delete()
            for codigo, monto, moneda in datos["tarifas"]:
                Tarifa.objects.create(
                    atractivo=atractivo,
                    tipo_tarifa=TipoTarifa.objects.get(codigo=codigo),
                    monto=Decimal(monto),
                    moneda=moneda,
                )
            for public_id, url, ancho, alto, orden, tipo in datos["fotos"]:
                Foto.objects.update_or_create(
                    public_id=public_id,
                    defaults={
                        "atractivo": atractivo,
                        "url": url,
                        "ancho": ancho,
                        "alto": alto,
                        "orden": orden,
                        "tipo": tipo,
                        "estado": "completed",
                    },
                )
            for titulo, tipo in datos["fuentes"]:
                FuenteDocumental.objects.update_or_create(
                    titulo=titulo,
                    defaults={"atractivo": atractivo, "tipo": tipo},
                )
        return len(ATRACTIVOS)

    def _demo_turista(self):
        usuario = Usuario.objects.get(email="demo.turista@example.com")
        cultura = Categoria.objects.get(nombre="Cultura")
        natura = Categoria.objects.get(nombre="Naturaleza")
        gastro = Categoria.objects.get(nombre="Gastronomía")
        for categoria, nivel in (
            (cultura, "0.90"),
            (natura, "0.70"),
            (gastro, "0.50"),
        ):
            UsuarioPreferencia.objects.update_or_create(
                usuario=usuario,
                categoria=categoria,
                defaults={"nivel_interes": Decimal(nivel)},
            )
        if not usuario.consultas_recomendacion.exists():
            for presupuesto, horas, lon, lat, macro in (
                ("50.00", "4.00", -68.1375, -16.4961, "Centro"),
                ("120.00", "6.50", -68.0673, -16.5685, "Mallasa"),
                ("30.00", "2.50", -68.1408, -16.4977, "Centro"),
            ):
                ConsultaRecomendacion.objects.create(
                    usuario=usuario,
                    presupuesto_bob=Decimal(presupuesto),
                    tiempo_horas=Decimal(horas),
                    punto_partida=Point(lon, lat, srid=4326),
                    macrodistrito=macro,
                )
