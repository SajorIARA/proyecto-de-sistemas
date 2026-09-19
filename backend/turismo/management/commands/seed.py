"""Datos de referencia del Sistema Turístico La Paz.

Idempotente: se puede ejecutar tantas veces como se quiera
(``python manage.py seed``). Rellena roles, tipos de tarifa,
categorías y atractivos reales de La Paz con geometrías (PostGIS),
horarios y tarifas.
"""

from decimal import Decimal

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand
from django.db import transaction

from conocimiento.models import FuenteDocumental
from recomendaciones.models import ConsultaRecomendacion, UsuarioPreferencia
from turismo.models import Atractivo, Categoria, Horario, Tarifa, TipoTarifa
from usuarios.models import Rol, Usuario

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
        (
            "Formaciones rocosas naturales modeladas por la erosión, "
            "ubicadas al sur de la ciudad."
        ),
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
        (
            "Conjunto de museos coloniales en una de las calles "
            "mejor conservadas de la ciudad."
        ),
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

# Trazabilidad de ingesta (V2): la mayoría proviene de la institución;
# algunos atractivos fueron incorporados vía scraping/otras fuentes.
FUENTES_ORIGEN = {
    "Mercado de las Brujas": "SCRAPING",
    "Valle de las Ánimas": "FUENTE_OFICIAL",
}

DEFAULT_FUENTE_ORIGEN = "INSTITUCIONAL"

# Usuario demo para persistir preferencias (gustos del turista) y consultas.
# Credenciales DEMO REALES (única definición): la contraseña se encripta
# en BD vía set_password (hashers PBKDF2 por defecto de Django) — el DoD
# "generación exitosa de tokens al verificar credenciales correctas" la usa
# para el login E2E/CI.
DEMO_USUARIO = {
    "email": "demo.turista@example.com",
    "password_llano": "demo1234!",
    "nombre": "Turista Demo",
}

DEMO_PREFERENCIAS = [
    ("Cultural", Decimal("0.90")),
    ("Naturaleza", Decimal("0.70")),
    ("Gastronomía", Decimal("0.50")),
]

# (presupuesto_bob, tiempo_horas, punto_partida (lng, lat), macrodistrito)
DEMO_CONSULTAS = [
    (50, Decimal("4.00"), (-68.1375, -16.4961), "Centro"),
    (120, Decimal("6.50"), (-68.0673, -16.5685), "Mallasa"),
    (30, Decimal("2.50"), (-68.1408, -16.4977), "Centro"),
]


class Command(BaseCommand):
    help = "Inserta datos de referencia (roles, tarifas, categorías, atractivos)."

    @transaction.atomic
    def handle(self, *args, **options):
        self._seed_roles()
        self._seed_tipos_tarifa()
        self._seed_categorias()
        self._seed_atractivos()
        preferencias, consultas = self._seed_demo_usuario()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seed completado: {Rol.objects.count()} roles, {TipoTarifa.objects.count()} tipos de tarifa, {Categoria.objects.count()} categorías, "
                f"{Atractivo.objects.count()} atractivos, {preferencias} preferencias, {consultas} consultas."
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
                    "fuente_origen": FUENTES_ORIGEN.get(nombre, DEFAULT_FUENTE_ORIGEN),
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

    def _seed_demo_usuario(self):
        usuario, _ = Usuario.objects.get_or_create(
            email=DEMO_USUARIO["email"],
            defaults={
                "nombre": DEMO_USUARIO["nombre"],
            },
        )
        if not usuario.has_usable_password():
            usuario.set_password(DEMO_USUARIO["password_llano"])
            usuario.nombre = DEMO_USUARIO["nombre"]
            usuario.save(update_fields=["password", "nombre"])
        for nombre_categoria, nivel_interes in DEMO_PREFERENCIAS:
            UsuarioPreferencia.objects.update_or_create(
                usuario=usuario,
                categoria=Categoria.objects.get(nombre=nombre_categoria),
                defaults={"nivel_interes": nivel_interes},
            )
        preferencias = usuario.preferencias.count()
        if not usuario.consultas_recomendacion.exists():
            for (
                presupuesto,
                tiempo,
                (longitud, latitud),
                macrodistrito,
            ) in DEMO_CONSULTAS:
                ConsultaRecomendacion.objects.create(
                    usuario=usuario,
                    presupuesto_bob=presupuesto,
                    tiempo_horas=tiempo,
                    punto_partida=Point(longitud, latitud, srid=4326),
                    macrodistrito=macrodistrito,
                )
        return preferencias, usuario.consultas_recomendacion.count()
