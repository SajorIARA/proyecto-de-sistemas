"""Datos de referencia del Sistema Turístico La Paz.

Idempotente: se puede ejecutar tantas veces como se quiera
(``python manage.py seed``). Rellena roles, tipos de tarifa,
categorías y atractivos reales de La Paz con geometrías (PostGIS),
horarios y tarifas.
"""

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand
from django.db import transaction

from turismo.models import (
    Atractivo,
    Categoria,
    FuenteDocumental,
    Horario,
    Rol,
    Tarifa,
    TipoTarifa,
)

ROLES = [
    ("ADMIN", "Administrador", "Usuario con permisos administrativos"),
    ("TOURIST", "Turista", "Usuario visitante de la plataforma"),
]

TIPOS_TARIFA = [
    ("GENERAL", "General", "Tarifa general de ingreso"),
    ("NINO", "Niño", "Tarifa reducida para niños"),
    ("ESTUDIANTE", "Estudiante", "Tarifa reducida para estudiantes"),
    ("ADULTO_MAYOR", "Adulto mayor", "Tarifa reducida para adultos mayores"),
]

CATEGORIAS = [
    ("Cultural", "Atractivos históricos y culturales"),
    ("Naturaleza", "Atractivos naturales y paisajísticos"),
    ("Miradores", "Miradores panorámicos de la ciudad"),
    ("Museos", "Museos y espacios de exhibición"),
    ("Gastronomía", "Espacios gastronómicos y mercados"),
    ("Parques Urbanos", "Parques y áreas recreativas urbanas"),
]

# (nombre, dirección, descripción, duración_min, (lng, lat), categorías,
#  horario habitual (apertura, cierre), día cerrado (1=lunes..7=domingo),
#  tarifas {código: monto en BOB})
ATRACTIVOS = [
    (
        "Valle de la Luna",
        "Av. Valle de la Luna, Mallasa",
        "Formaciones rocosas naturales modeladas por la erosión, "
        "ubicadas al sur de la ciudad.",
        120,
        (-68.0673, -16.5685),
        ["Naturaleza"],
        ("09:00", "17:00"),
        None,
        {"GENERAL": 30, "NINO": 10, "ESTUDIANTE": 15},
    ),
    (
        "Parque Urbano Central",
        "Av. Simón Bolívar",
        "Parque urbano con áreas verdes, juegos y espacio para eventos.",
        90,
        (-68.1266, -16.4993),
        ["Parques Urbanos"],
        ("06:00", "21:00"),
        None,
        {},
    ),
    (
        "Plaza Murillo",
        "Calle Comercio y Ayacucho",
        "Plaza principal de la ciudad, sede del poder político del país.",
        45,
        (-68.1375, -16.4961),
        ["Cultural"],
        ("08:00", "20:00"),
        None,
        {},
    ),
    (
        "Basílica de San Francisco",
        "Plaza San Francisco",
        "Iglesia y museo religioso colonial en pleno centro de La Paz.",
        60,
        (-68.1385, -16.4945),
        ["Cultural", "Museos"],
        ("09:00", "18:00"),
        None,
        {"GENERAL": 5},
    ),
    (
        "Mercado de las Brujas",
        "Calle Linares y alrededores",
        "Callejón de artesanías, hierbas y objetos tradicionales.",
        90,
        (-68.1408, -16.4977),
        ["Gastronomía", "Cultural"],
        ("09:00", "19:00"),
        None,
        {},
    ),
    (
        "Mirador Killi Killi",
        "Av. Killakillas",
        "Mirador natural con vista panorámica del centro de La Paz.",
        60,
        (-68.1276, -16.4897),
        ["Miradores"],
        ("08:00", "20:00"),
        None,
        {},
    ),
    (
        "Museo de la Calle Jaén",
        "Calle Jaén",
        "Conjunto de museos coloniales en una de las calles "
        "mejor conservadas de la ciudad.",
        90,
        (-68.1386, -16.4940),
        ["Museos", "Cultural"],
        ("09:00", "18:00"),
        1,
        {"GENERAL": 20, "NINO": 5, "ESTUDIANTE": 7, "ADULTO_MAYOR": 0},
    ),
    (
        "Valle de las Ánimas",
        "Zona Sur, Mallasa",
        "Quebradas con formaciones rocosas ideales para senderismo.",
        180,
        (-68.0560, -16.5730),
        ["Naturaleza"],
        ("07:00", "18:00"),
        None,
        {},
    ),
]

HORARIOS_SEMANA = [1, 2, 3, 4, 5, 6, 7]


class Command(BaseCommand):
    help = "Inserta datos de referencia (roles, tarifas, categorías, atractivos)."

    @transaction.atomic
    def handle(self, *args, **options):
        self._seed_roles()
        self._seed_tipos_tarifa()
        self._seed_categorias()
        self._seed_atractivos()
        self.stdout.write(
            self.style.SUCCESS(
                "Seed completado: {} roles, {} tipos de tarifa, {} categorías, "
                "{} atractivos.".format(
                    Rol.objects.count(),
                    TipoTarifa.objects.count(),
                    Categoria.objects.count(),
                    Atractivo.objects.count(),
                )
            )
        )

    def _seed_roles(self):
        for codigo, nombre, descripcion in ROLES:
            Rol.objects.update_or_create(
                codigo=codigo,
                defaults={"nombre": nombre, "descripcion": descripcion},
            )

    def _seed_tipos_tarifa(self):
        for codigo, nombre, descripcion in TIPOS_TARIFA:
            TipoTarifa.objects.update_or_create(
                codigo=codigo,
                defaults={"nombre": nombre, "descripcion": descripcion},
            )

    def _seed_categorias(self):
        for nombre, descripcion in CATEGORIAS:
            Categoria.objects.update_or_create(
                nombre=nombre,
                defaults={"descripcion": descripcion},
            )

    def _seed_atractivos(self):
        for datos in ATRACTIVOS:
            (
                nombre,
                direccion,
                descripcion,
                duracion_minutos,
                (longitud, latitud),
                categorias,
                (hora_apertura, hora_cierre),
                dia_cerrado,
                tarifas,
            ) = datos
            atractivo, _ = Atractivo.objects.update_or_create(
                nombre=nombre,
                defaults={
                    "direccion": direccion,
                    "descripcion": descripcion,
                    "duracion_minutos": duracion_minutos,
                    "ubicacion": Point(longitud, latitud, srid=4326),
                },
            )
            atractivo.categorias.set(Categoria.objects.filter(nombre__in=categorias))
            FuenteDocumental.objects.get_or_create(
                atractivo=atractivo,
                titulo=f"Reseña de {nombre}",
                defaults={"tipo": "guia"},
            )
            self._seed_horarios(atractivo, hora_apertura, hora_cierre, dia_cerrado)
            self._seed_tarifas(atractivo, tarifas)

    def _seed_horarios(self, atractivo, apertura, cierre, dia_cerrado):
        atractivo.horarios.all().delete()
        for dia in HORARIOS_SEMANA:
            Horario.objects.create(
                atractivo=atractivo,
                dia_semana=dia,
                hora_apertura=None if dia == dia_cerrado else apertura,
                hora_cierre=None if dia == dia_cerrado else cierre,
                cerrado=dia == dia_cerrado,
            )

    def _seed_tarifas(self, atractivo, tarifas):
        atractivo.tarifas.filter(
            vigente_desde__isnull=True,
            vigente_hasta__isnull=True,
        ).delete()
        for codigo, monto in tarifas.items():
            Tarifa.objects.update_or_create(
                atractivo=atractivo,
                tipo_tarifa=TipoTarifa.objects.get(codigo=codigo),
                vigente_desde=None,
                vigente_hasta=None,
                defaults={"monto": monto, "moneda": "BOB"},
            )
