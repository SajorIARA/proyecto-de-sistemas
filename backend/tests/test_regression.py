from __future__ import annotations

from decimal import Decimal

from django.contrib.gis.geos import Point
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from conocimiento.models import FragmentoDocumental, FuenteDocumental
from recomendaciones.models import ConsultaRecomendacion, UsuarioPreferencia
from turismo.models import (
    Atractivo,
    AtractivoCategoria,
    Categoria,
    Horario,
    Tarifa,
    TipoTarifa,
)
from usuarios.models import Rol, Usuario, UsuarioRol
from usuarios.permissions import HasRole, IsAdmin, IsTurista
from usuarios.serializers import RegisterSerializer


def _crear_usuario(email: str, password: str, nombre: str = "Test") -> Usuario:
    return Usuario.objects.create_user(email=email, password=password, nombre=nombre)


def _crear_usuario_con_rol(email: str, password: str, codigo: str) -> Usuario:
    u = _crear_usuario(email, password, f"User {codigo}")
    rol, _ = Rol.objects.get_or_create(
        codigo=codigo,
        defaults={"nombre": codigo, "descripcion": f"Rol {codigo}"},
    )
    u.roles.add(rol)
    return u


# ═══════════════════════════════════════════════════════════════════════
# 1. MODELOS — Esquema, constraints, relaciones, defaults
# ═══════════════════════════════════════════════════════════════════════


class RegressionModelSchemaTests(TestCase):
    """Verifica que las tablas tengan los nombres correctos del esquema SQL."""

    def test_tablas_usuarios(self) -> None:
        self.assertEqual(Usuario._meta.db_table, "usuario")
        self.assertEqual(Rol._meta.db_table, "rol")
        self.assertEqual(UsuarioRol._meta.db_table, "usuario_rol")

    def test_tablas_turismo(self) -> None:
        self.assertEqual(Categoria._meta.db_table, "categoria")
        self.assertEqual(Atractivo._meta.db_table, "atractivo")
        self.assertEqual(AtractivoCategoria._meta.db_table, "atractivo_categoria")
        self.assertEqual(Horario._meta.db_table, "horario")
        self.assertEqual(TipoTarifa._meta.db_table, "tipo_tarifa")
        self.assertEqual(Tarifa._meta.db_table, "tarifa")

    def test_tablas_conocimiento(self) -> None:
        self.assertEqual(FuenteDocumental._meta.db_table, "fuente_documental")
        self.assertEqual(FragmentoDocumental._meta.db_table, "fragmento_documental")

    def test_tablas_recomendaciones(self) -> None:
        self.assertEqual(UsuarioPreferencia._meta.db_table, "usuario_preferencia")
        self.assertEqual(ConsultaRecomendacion._meta.db_table, "consulta_recomendacion")


class RegressionFieldDefaultsTests(TestCase):
    """Verifica defaults de campos que deben mantenerse tras refactors."""

    def test_atractivo_fuente_origen_default(self) -> None:
        field = Atractivo._meta.get_field("fuente_origen")
        self.assertEqual(field.default, "INSTITUCIONAL")
        self.assertEqual(field.db_default, "INSTITUCIONAL")

    def test_tarifa_moneda_default(self) -> None:
        field = Tarifa._meta.get_field("moneda")
        self.assertEqual(field.default, "BOB")

    def test_usuario_activo_default_true(self) -> None:
        field = Usuario._meta.get_field("activo")
        self.assertTrue(field.default)


class RegressionConstraintsTests(TestCase):
    """Verifica constraints CHECK del esquema SQL."""

    def setUp(self) -> None:
        self.usuario = _crear_usuario("constraint@test.com", "clave1234!")
        self.cat = Categoria.objects.create(nombre="Test")
        self.atractivo = Atractivo.objects.create(
            nombre="Atractivo Test",
            descripcion="Desc",
            ubicacion=Point(-68.1, -16.5, srid=4326),
        )

    def test_atractivo_duracion_no_negativa(self) -> None:
        self.atractivo.duracion_minutos = -5
        with self.assertRaises(Exception):
            self.atractivo.save()

    def test_atractivo_duracion_null_permitido(self) -> None:
        self.atractivo.duracion_minutos = None
        self.atractivo.save()
        self.atractivo.refresh_from_db()
        self.assertIsNone(self.atractivo.duracion_minutos)

    def test_tarifa_monto_no_negativo(self) -> None:
        tipo = TipoTarifa.objects.create(codigo="STD", nombre="Estándar")
        with self.assertRaises(Exception):
            Tarifa.objects.create(
                atractivo=self.atractivo,
                tipo_tarifa=tipo,
                monto=Decimal("-10.00"),
            )

    def test_horario_dia_semana_valido(self) -> None:
        with self.assertRaises(Exception):
            Horario.objects.create(
                atractivo=self.atractivo,
                dia_semana=0,
                hora_apertura="09:00",
                hora_cierre="17:00",
            )

    def test_horario_dia_semana_8_invalido(self) -> None:
        with self.assertRaises(Exception):
            Horario.objects.create(
                atractivo=self.atractivo,
                dia_semana=8,
                hora_apertura="09:00",
                hora_cierre="17:00",
            )


class RegressionRelationsTests(TestCase):
    """Verifica relaciones ManyToMany y cascadas."""

    def setUp(self) -> None:
        self.usuario = _crear_usuario("rel@test.com", "clave1234!")
        self.rol = Rol.objects.create(codigo="TOURIST", nombre="Turista")
        self.cat = Categoria.objects.create(nombre="Naturaleza")
        self.atractivo = Atractivo.objects.create(
            nombre="Rel Test",
            descripcion="Desc",
            ubicacion=Point(-68.1, -16.5, srid=4326),
        )

    def test_usuario_rol_assign(self) -> None:
        self.usuario.roles.add(self.rol)
        self.assertEqual(self.usuario.roles.count(), 1)
        self.assertIn(self.rol, self.usuario.roles.all())

    def test_usuario_rol_no_duplicado(self) -> None:
        self.usuario.roles.add(self.rol)
        self.usuario.roles.add(self.rol)
        self.assertEqual(self.usuario.roles.count(), 1)

    def test_atractivo_categoria_assign(self) -> None:
        self.atractivo.categorias.add(self.cat)
        self.assertEqual(self.atractivo.categorias.count(), 1)

    def test_usuario_delete_cascade_rol_no_borra(self) -> None:
        """Eliminar usuario no borra el rol (RESTRICT en UsuarioRol)."""
        self.usuario.roles.add(self.rol)
        user_id = self.usuario.id_usuario
        Usuario.objects.filter(id_usuario=user_id).delete()
        self.assertTrue(Rol.objects.filter(id_rol=self.rol.id_rol).exists())


# ═══════════════════════════════════════════════════════════════════════
# 2. AUTH — Login, register, logout, refresh, contraseñas
# ═══════════════════════════════════════════════════════════════════════


class RegressionAuthTests(TestCase):
    """Flujos completos de autenticación JWT."""

    def setUp(self) -> None:
        self.cliente = APIClient()
        self.email = "auth_regression@test.com"
        self.password = "clave1234!"
        self.usuario = _crear_usuario(self.email, self.password, "Auth Test")

    def _login(self, email: str = None, password: str = None) -> dict:
        resp = self.cliente.post(
            "/api/auth/login/",
            {
                "email": email or self.email,
                "password": password or self.password,
            },
            format="json",
        )
        return resp

    def test_login_success_returns_access_and_refresh(self) -> None:
        resp = self._login()
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
        self.assertIn("user", resp.data)
        self.assertEqual(resp.data["user"]["email"], self.email)

    def test_login_wrong_password_returns_4xx(self) -> None:
        resp = self._login(password="wrong_password")
        self.assertIn(resp.status_code, (400, 401))

    def test_login_nonexistent_user_returns_4xx(self) -> None:
        resp = self._login(email="noexiste@test.com")
        self.assertIn(resp.status_code, (400, 401))

    def test_login_empty_body_returns_400(self) -> None:
        resp = self.cliente.post("/api/auth/login/", {}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_register_creates_user_with_tourist_role(self) -> None:
        resp = self.cliente.post(
            "/api/auth/register/",
            {
                "nombre": "Nuevo",
                "email": "nuevo_regression@test.com",
                "password": "clave1234!",
                "password_confirm": "clave1234!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(
            Usuario.objects.filter(email="nuevo_regression@test.com").exists()
        )
        u = Usuario.objects.get(email="nuevo_regression@test.com")
        self.assertTrue(u.roles.filter(codigo="TOURIST").exists())

    def test_register_duplicate_email_returns_400(self) -> None:
        resp = self.cliente.post(
            "/api/auth/register/",
            {
                "nombre": "Dup",
                "email": self.email,
                "password": "clave1234!",
                "password_confirm": "clave1234!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_register_mismatched_passwords_returns_400(self) -> None:
        resp = self.cliente.post(
            "/api/auth/register/",
            {
                "nombre": "Mismatch",
                "email": "mismatch@test.com",
                "password": "clave1234!",
                "password_confirm": "otra_clave!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_register_short_password_returns_400(self) -> None:
        resp = self.cliente.post(
            "/api/auth/register/",
            {
                "nombre": "Short",
                "email": "short@test.com",
                "password": "abc",
                "password_confirm": "abc",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_refresh_token_generates_new_access(self) -> None:
        login_resp = self._login()
        refresh = login_resp.data["refresh"]
        resp = self.cliente.post(
            "/api/auth/token/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)
        self.assertNotEqual(resp.data["access"], login_resp.data["access"])

    def test_refresh_invalid_token_returns_401(self) -> None:
        resp = self.cliente.post(
            "/api/auth/token/refresh/",
            {"refresh": "invalid_token"},
            format="json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_refresh_empty_body_returns_400(self) -> None:
        resp = self.cliente.post("/api/auth/token/refresh/", {}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_logout_blacklists_refresh_token(self) -> None:
        login_resp = self._login()
        refresh = login_resp.data["refresh"]
        access = login_resp.data["access"]
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = self.cliente.post(
            "/api/auth/logout/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(resp.status_code, 204)
        resp2 = self.cliente.post(
            "/api/auth/token/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(resp2.status_code, 401)

    def test_logout_without_auth_returns_401(self) -> None:
        login_resp = self._login()
        resp = self.cliente.post(
            "/api/auth/logout/",
            {"refresh": login_resp.data["refresh"]},
            format="json",
        )
        self.assertEqual(resp.status_code, 401)


class RegressionPasswordSecurityTests(TestCase):
    """Verifica que las contraseñas se hasheen y nunca se almacenen en claro."""

    def test_password_is_hashed_in_db(self) -> None:
        u = _crear_usuario("hash@test.com", "clave1234!")
        u.refresh_from_db()
        self.assertNotEqual(u.password, "clave1234!")
        self.assertTrue(u.check_password("clave1234!"))

    def test_register_serializer_hashes_password(self) -> None:
        serializer = RegisterSerializer(
            data={
                "nombre": "Hash Test",
                "email": "serializer_hash@test.com",
                "password": "clave1234!",
                "password_confirm": "clave1234!",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        usuario, _, _ = serializer.save()
        usuario.refresh_from_db()
        self.assertNotEqual(usuario.password, "clave1234!")
        self.assertTrue(usuario.check_password("clave1234!"))

    def test_create_user_with_no_password(self) -> None:
        u = Usuario.objects.create_user(
            email="nopass@test.com", password=None, nombre="No Pass"
        )
        self.assertTrue(u.has_usable_password() is False)


# ═══════════════════════════════════════════════════════════════════════
# 3. RBAC — Permisos y endpoint admin
# ═══════════════════════════════════════════════════════════════════════


class RegressionRBACTests(TestCase):
    """Permisos RBAC aplicados a endpoints protegidos."""

    def setUp(self) -> None:
        self.cliente = APIClient()
        self.admin = _crear_usuario_con_rol(
            "rbac_admin@test.com", "clave1234!", "ADMIN"
        )
        self.turista = _crear_usuario_con_rol(
            "rbac_turista@test.com", "clave1234!", "TOURIST"
        )
        self.sin_rol = _crear_usuario("rbac_norol@test.com", "clave1234!", "Sin Rol")

    def _login(self, email: str) -> dict:
        resp = self.cliente.post(
            "/api/auth/login/",
            {"email": email, "password": "clave1234!"},
            format="json",
        )
        return resp.data

    def test_admin_can_access_admin_endpoint(self) -> None:
        tokens = self._login("rbac_admin@test.com")
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        resp = self.cliente.get("/api/auth/usuarios/")
        self.assertEqual(resp.status_code, 200)

    def test_turista_forbidden_on_admin_endpoint(self) -> None:
        tokens = self._login("rbac_turista@test.com")
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        resp = self.cliente.get("/api/auth/usuarios/")
        self.assertEqual(resp.status_code, 403)

    def test_no_rol_forbidden_on_admin_endpoint(self) -> None:
        tokens = self._login("rbac_norol@test.com")
        self.cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        resp = self.cliente.get("/api/auth/usuarios/")
        self.assertEqual(resp.status_code, 403)

    def test_unauthenticated_on_admin_endpoint(self) -> None:
        resp = self.cliente.get("/api/auth/usuarios/")
        self.assertIn(resp.status_code, (401, 403))


class RegressionPermissionUnitTests(TestCase):
    """Tests unitarios de HasRole / IsAdmin / IsTurista."""

    def _req(self, user) -> object:
        class R:
            def __init__(self, u):
                self.user = u

        return R(user)

    def test_has_role_single_match(self) -> None:
        u = _crear_usuario_con_rol("hr1@test.com", "c", "ADMIN")
        self.assertTrue(HasRole("ADMIN").has_permission(self._req(u), None))

    def test_has_role_single_no_match(self) -> None:
        u = _crear_usuario_con_rol("hr2@test.com", "c", "TOURIST")
        self.assertFalse(HasRole("ADMIN").has_permission(self._req(u), None))

    def test_has_role_multi_match(self) -> None:
        u = _crear_usuario_con_rol("hr3@test.com", "c", "TOURIST")
        self.assertTrue(HasRole("ADMIN", "TOURIST").has_permission(self._req(u), None))

    def test_has_role_no_roles(self) -> None:
        u = _crear_usuario("hr4@test.com", "c", "No Role")
        self.assertFalse(HasRole("ADMIN").has_permission(self._req(u), None))

    def test_has_role_unauthenticated(self) -> None:
        class Anon:
            is_authenticated = False

        self.assertFalse(HasRole("ADMIN").has_permission(self._req(Anon()), None))

    def test_is_admin_exact(self) -> None:
        admin = _crear_usuario_con_rol("ia1@test.com", "c", "ADMIN")
        tour = _crear_usuario_con_rol("ia2@test.com", "c", "TOURIST")
        self.assertTrue(IsAdmin().has_permission(self._req(admin), None))
        self.assertFalse(IsAdmin().has_permission(self._req(tour), None))

    def test_is_turista_exact(self) -> None:
        tour = _crear_usuario_con_rol("it1@test.com", "c", "TOURIST")
        admin = _crear_usuario_con_rol("it2@test.com", "c", "ADMIN")
        self.assertTrue(IsTurista().has_permission(self._req(tour), None))
        self.assertFalse(IsTurista().has_permission(self._req(admin), None))


# ═══════════════════════════════════════════════════════════════════════
# 4. TURISMO — API pública, paginación, búsqueda, filtros
# ═══════════════════════════════════════════════════════════════════════


class RegressionTurismoAPITests(TestCase):
    """Endpoints públicos de turismo — no requieren auth."""

    def setUp(self) -> None:
        self.cat = Categoria.objects.create(nombre="Cultura")
        self.atractivo = Atractivo.objects.create(
            nombre="Museo de Arte Moderno",
            descripcion="Museo en el centro",
            ubicacion=Point(-68.12, -16.50, srid=4326),
        )
        self.atractivo.categorias.add(self.cat)

    def test_listado_publico_returns_200(self) -> None:
        resp = self.client.get("/api/turismo/atractivos/")
        self.assertEqual(resp.status_code, 200)

    def test_listado_incluye_categorias(self) -> None:
        resp = self.client.get("/api/turismo/atractivos/")
        result = resp.json()["results"][0]
        self.assertIn("Cultura", result["categorias"])

    def test_busqueda_por_nombre(self) -> None:
        resp = self.client.get("/api/turismo/atractivos/?q=museo")
        self.assertEqual(resp.json()["count"], 1)

    def test_busqueda_vacia(self) -> None:
        resp = self.client.get("/api/turismo/atractivos/?q=xyznoexistente")
        self.assertEqual(resp.json()["count"], 0)

    def test_atractivo_inactivo_no_aparece(self) -> None:
        self.atractivo.activo = False
        self.atractivo.save(update_fields=["activo"])
        resp = self.client.get("/api/turismo/atractivos/")
        self.assertEqual(resp.json()["count"], 0)

    def test_listado_paginado(self) -> None:
        for i in range(25):
            Atractivo.objects.create(
                nombre=f"Atractivo {i}",
                descripcion=f"Desc {i}",
                ubicacion=Point(-68.1 + i * 0.01, -16.5, srid=4326),
            )
        resp = self.client.get("/api/turismo/atractivos/")
        data = resp.json()
        self.assertIn("results", data)
        self.assertIn("count", data)
        self.assertEqual(data["count"], 26)

    def test_health_endpoint(self) -> None:
        resp = self.client.get("/api/health/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ok")

    def test_root_endpoint(self) -> None:
        resp = self.client.get("/api/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ok")


# ═══════════════════════════════════════════════════════════════════════
# 5. SEED — Idempotencia del comando seed
# ═══════════════════════════════════════════════════════════════════════


class RegressionSeedTests(TestCase):

    def test_seed_is_idempotent(self) -> None:
        call_command("seed")
        call_command("seed")
        self.assertGreaterEqual(Rol.objects.count(), 2)
        self.assertGreaterEqual(Categoria.objects.count(), 6)
        self.assertGreaterEqual(Atractivo.objects.count(), 5)
        self.assertGreaterEqual(TipoTarifa.objects.count(), 4)
        self.assertGreaterEqual(Horario.objects.count(), 5)
        self.assertGreaterEqual(Tarifa.objects.count(), 4)

    def test_seed_creates_admin_role(self) -> None:
        call_command("seed")
        self.assertTrue(Rol.objects.filter(codigo="ADMIN").exists())

    def test_seed_creates_tourist_role(self) -> None:
        call_command("seed")
        self.assertTrue(Rol.objects.filter(codigo="TOURIST").exists())


# ═══════════════════════════════════════════════════════════════════════
# 6. CONOCIMIENTO — Fragmentos y embeddings
# ═══════════════════════════════════════════════════════════════════════


class RegressionConocimientoTests(TestCase):

    def test_crear_fuente_y_fragmento(self) -> None:
        fuente = FuenteDocumental.objects.create(titulo="Test Guía", tipo="guia")
        fragmento = FragmentoDocumental.objects.create(
            fuente=fuente,
            numero_fragmento=1,
            contenido="Contenido de prueba.",
            embedding=[0.1] * 1536,
        )
        self.assertEqual(fragmento.fuente, fuente)
        self.assertEqual(len(fragmento.embedding), 1536)


# ═══════════════════════════════════════════════════════════════════════
# 7. RECOMENDACIONES — Preferencias y consultas
# ═══════════════════════════════════════════════════════════════════════


class RegressionRecomendacionesTests(TestCase):

    def setUp(self) -> None:
        self.usuario = _crear_usuario("rec@test.com", "clave1234!")
        self.categoria = Categoria.objects.create(nombre="Gastronomía")

    def test_preferencia_valida(self) -> None:
        pref = UsuarioPreferencia.objects.create(
            usuario=self.usuario,
            categoria=self.categoria,
            nivel_interes=Decimal("0.75"),
        )
        self.assertEqual(pref.nivel_interes, Decimal("0.75"))

    def test_preferencia_nivel_invalido(self) -> None:
        with self.assertRaises(Exception):
            UsuarioPreferencia.objects.create(
                usuario=self.usuario,
                categoria=self.categoria,
                nivel_interes=Decimal("1.50"),
            )

    def test_consulta_valida(self) -> None:
        consulta = ConsultaRecomendacion.objects.create(
            usuario=self.usuario,
            presupuesto_bob=Decimal("200.00"),
            tiempo_horas=Decimal("8.00"),
            punto_partida=Point(-68.1, -16.5, srid=4326),
        )
        self.assertEqual(consulta.presupuesto_bob, Decimal("200.00"))

    def test_consulta_tiempo_cero_invalido(self) -> None:
        with self.assertRaises(Exception):
            ConsultaRecomendacion.objects.create(
                usuario=self.usuario,
                presupuesto_bob=Decimal("100.00"),
                tiempo_horas=Decimal("0.00"),
                punto_partida=Point(-68.1, -16.5, srid=4326),
            )


# ═══════════════════════════════════════════════════════════════════════
# 8. CONFIGURACIÓN — Settings críticos
# ═══════════════════════════════════════════════════════════════════════


class RegressionConfigTests(TestCase):
    """Verifica que settings críticos no cambien por accidente."""

    def test_rest_framework_auth_classes(self) -> None:
        from django.conf import settings

        drf = settings.REST_FRAMEWORK
        self.assertIn(
            "rest_framework_simplejwt.authentication.JWTAuthentication",
            drf["DEFAULT_AUTHENTICATION_CLASSES"],
        )

    def test_rest_framework_default_permission_is_authenticated(self) -> None:
        from django.conf import settings

        drf = settings.REST_FRAMEWORK
        self.assertIn(
            "rest_framework.permissions.IsAuthenticated",
            drf["DEFAULT_PERMISSION_CLASSES"],
        )

    def test_jwt_access_token_lifetime(self) -> None:
        from datetime import timedelta

        from django.conf import settings

        self.assertEqual(
            settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"],
            timedelta(minutes=30),
        )

    def test_jwt_refresh_token_lifetime(self) -> None:
        from datetime import timedelta

        from django.conf import settings

        self.assertEqual(
            settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"],
            timedelta(days=7),
        )

    def test_blacklist_app_installed(self) -> None:
        from django.conf import settings

        self.assertIn(
            "rest_framework_simplejwt.token_blacklist",
            settings.INSTALLED_APPS,
        )

    def test_cors_origins_configured(self) -> None:
        from django.conf import settings

        self.assertTrue(hasattr(settings, "CORS_ALLOWED_ORIGINS"))
        self.assertIsInstance(settings.CORS_ALLOWED_ORIGINS, list)
