from __future__ import annotations

from contextlib import contextmanager
from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from conocimiento.fuentes_abiertas import CandidatoLugar
from conocimiento.importacion_lugares import crear_importacion
from conocimiento.models import (
    FragmentoDocumental,
    FuenteDocumental,
    ImportacionLugares,
    LugarCandidato,
)
from conocimiento.ollama import OllamaNoDisponible
from conocimiento.services import (
    aprobar_lugar_candidato,
    encolar_vectorizacion,
    rechazar_lugar_candidato,
)
from conocimiento.tasks import (
    importar_lugares_abiertos_task,
    vectorizar_importacion_task,
)
from turismo.models import Atractivo
from usuarios.models import Rol, Usuario

LUGAR = CandidatoLugar(
    fuente="overpass",
    id_externo="node/123",
    nombre="ZZTEST Mercado de las Brujas",
    descripcion="Mercado tradicional del centro de La Paz.",
    categoria_sugerida="Compras",
    latitud=-16.4962,
    longitud=-68.1391,
    direccion="Calle Linares",
    horario_declarado="",
    sitio_web="",
    url_fuente="https://www.openstreetmap.org/node/123",
    licencia="ODbL — OpenStreetMap contributors",
)


@contextmanager
def on_commit_inmediato():
    """Ejecuta los callbacks de commit dentro del TestCase (sin commit real)."""

    with mock.patch(
        "django.db.transaction.on_commit", side_effect=lambda callback: callback()
    ):
        yield


def _vector(posicion: int = 0) -> list[float]:
    valor = [0.0] * 768
    valor[posicion] = 1.0
    return valor


def _crear_usuario(email: str, codigo: str) -> Usuario:
    usuario = Usuario.objects.create_user(
        email=email, password="clave1234!", nombre=f"User {codigo}"
    )
    rol, _ = Rol.objects.get_or_create(
        codigo=codigo, defaults={"nombre": codigo, "descripcion": codigo}
    )
    usuario.roles.add(rol)
    return usuario


class ImportacionServiceTests(TestCase):
    def setUp(self) -> None:
        parche = mock.patch(
            "conocimiento.importacion_lugares.buscar_lugares",
            return_value=([LUGAR], {}),
        )
        self.buscar = parche.start()
        self.addCleanup(parche.stop)

    def test_importacion_repetida_no_duplica_candidatos(self) -> None:
        primera = crear_importacion("mercado", ciudad="La Paz", limite=5)
        segunda = crear_importacion("mercado", ciudad="La Paz", limite=5)

        self.assertEqual(LugarCandidato.objects.count(), 1)
        self.assertEqual(primera.creados, 1)
        self.assertEqual(segunda.creados, 1)
        self.assertEqual(segunda.duplicados, 0)
        # Cada búsqueda genera su propio lote, pero no clona los candidatos.
        self.assertNotEqual(primera.id_importacion, segunda.id_importacion)

    def test_aprobacion_crea_destino_fuente_fragmentos_y_encola_vectorizacion(self) -> None:
        crear_importacion("mercado", ciudad="La Paz", limite=5)
        candidato = LugarCandidato.objects.get()
        with (
            on_commit_inmediato(),
            mock.patch(
                "conocimiento.tasks.vectorizar_importacion_task.delay"
            ) as encolar,
        ):
            aprobar_lugar_candidato(
                candidato, categoria="Compras", duracion_minutos=45
            )

        candidato.refresh_from_db()
        self.assertEqual(candidato.estado, LugarCandidato.ESTADO_APROBADO)
        self.assertEqual(candidato.duracion_minutos, 45)
        self.assertEqual(Atractivo.objects.count(), 1)
        self.assertEqual(FuenteDocumental.objects.count(), 1)
        fragmentos = FragmentoDocumental.objects.all()
        self.assertEqual(fragmentos.count(), 1)
        texto = fragmentos[0].contenido
        self.assertIn("Lugar: ZZTEST Mercado de las Brujas", texto)
        self.assertIn("Horario declarado: No verificado", texto)
        self.assertIn("Fecha de consulta:", texto)
        self.assertIsNone(fragmentos[0].embedding)
        self.assertEqual(candidato.importacion.estado_vectorizacion, "pendiente")
        encolar.assert_called_once()

        with mock.patch(
            "conocimiento.tasks.vectorizar_importacion_task.delay"
        ):
            aprobar_lugar_candidato(
                candidato, categoria="Compras", duracion_minutos=45
            )
        self.assertEqual(Atractivo.objects.count(), 1)
        self.assertEqual(FuenteDocumental.objects.count(), 1)
        self.assertEqual(FragmentoDocumental.objects.count(), 1)

    def test_rechazo_no_publica_nada(self) -> None:
        crear_importacion("mercado", ciudad="La Paz", limite=5)
        candidato = LugarCandidato.objects.get()
        rechazar_lugar_candidato(candidato, notas="Duplicado del catálogo")

        candidato.refresh_from_db()
        self.assertEqual(candidato.estado, LugarCandidato.ESTADO_RECHAZADO)
        self.assertEqual(Atractivo.objects.count(), 0)
        self.assertEqual(FuenteDocumental.objects.count(), 0)
        with self.assertRaises(ValueError):
            aprobar_lugar_candidato(
                candidato, categoria="Compras", duracion_minutos=45
            )

    def test_fallo_del_broker_no_reporta_vectorizacion_encolada(self) -> None:
        crear_importacion("mercado", ciudad="La Paz", limite=5)
        importacion = LugarCandidato.objects.get().importacion
        with mock.patch(
            "conocimiento.tasks.vectorizar_importacion_task.delay",
            side_effect=RuntimeError("Redis no disponible"),
        ):
            self.assertFalse(encolar_vectorizacion(importacion.id_importacion))
        importacion.refresh_from_db()
        self.assertEqual(importacion.estado_vectorizacion, "error")
        self.assertIn("Redis no disponible", importacion.error_vectorizacion)

    def test_fallo_de_ollama_marca_error_en_la_importacion(self) -> None:
        crear_importacion("mercado", ciudad="La Paz", limite=5)
        candidato = LugarCandidato.objects.get()
        with on_commit_inmediato(), mock.patch(
            "conocimiento.tasks.vectorizar_importacion_task.delay"
        ):
            aprobar_lugar_candidato(
                candidato, categoria="Compras", duracion_minutos=45
            )
        with mock.patch(
            "conocimiento.tasks.vectorizar_fragmentos",
            side_effect=OllamaNoDisponible("sin modelo"),
        ):
            with self.assertRaises(OllamaNoDisponible):
                vectorizar_importacion_task.run(
                    str(candidato.importacion_id)
                )
        candidato.importacion.refresh_from_db()
        self.assertEqual(candidato.importacion.estado_vectorizacion, "error")
        self.assertIn("sin modelo", candidato.importacion.error_vectorizacion)


class ImportacionAdminAPITests(TestCase):
    IMP = "/api/conocimiento/admin/importaciones/"
    CAND = "/api/conocimiento/admin/candidatos/"

    def setUp(self) -> None:
        cache.clear()
        self.cliente = APIClient()
        self.admin = _crear_usuario("admin_import@test.com", "ADMIN")
        self.turista = _crear_usuario("turista_import@test.com", "TOURIST")
        parche = mock.patch(
            "conocimiento.importacion_lugares.buscar_lugares",
            return_value=([LUGAR], {}),
        )
        self.buscar = parche.start()
        self.addCleanup(parche.stop)
        self.addCleanup(cache.clear)

    def _ejecutar_importacion(
        self, *, id_importacion: str, consulta: str, ciudad: str, fuentes, limite: int
    ) -> None:
        """Simula al worker: ejecuta la tarea con los argumentos encolados."""

        importar_lugares_abiertos_task.run(
            consulta=consulta,
            ciudad=ciudad,
            fuentes=fuentes,
            limite=limite,
            id_importacion=id_importacion,
        )

    def _crear_importacion(self) -> dict:
        self.cliente.force_authenticate(user=self.admin)
        with mock.patch(
            "conocimiento.tasks.importar_lugares_abiertos_task.delay",
            side_effect=self._ejecutar_importacion,
        ) as enviar:
            respuesta = self.cliente.post(
                self.IMP,
                {"consulta": "mercado", "ciudad": "La Paz", "limite": 5},
                format="json",
            )
        self.assertEqual(respuesta.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(enviar.called)
        return respuesta.data

    def test_post_encola_y_la_tarea_completa_el_registro_pendiente(self) -> None:
        self.cliente.force_authenticate(user=self.admin)
        with mock.patch(
            "conocimiento.tasks.importar_lugares_abiertos_task.delay"
        ) as enviar:
            respuesta = self.cliente.post(
                self.IMP,
                {"consulta": "mercado", "ciudad": "La Paz", "limite": 5},
                format="json",
            )
        self.assertEqual(respuesta.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(respuesta.data["estado"], "pendiente")
        self.assertEqual(respuesta.data["encontrados"], 0)
        self.buscar.assert_not_called()
        importacion = ImportacionLugares.objects.get(
            pk=respuesta.data["id_importacion"]
        )
        argumentos = enviar.call_args.kwargs
        self.assertEqual(argumentos["id_importacion"], str(importacion.pk))
        self.assertEqual(argumentos["consulta"], "mercado")
        importar_lugares_abiertos_task.run(**argumentos)
        importacion.refresh_from_db()
        self.assertEqual(importacion.estado, "completado")
        self.assertEqual(importacion.encontrados, 1)
        self.assertEqual(LugarCandidato.objects.count(), 1)

    def test_fallo_del_broker_no_simula_importacion_exitosa(self) -> None:
        self.cliente.force_authenticate(user=self.admin)
        with mock.patch(
            "conocimiento.tasks.importar_lugares_abiertos_task.delay",
            side_effect=RuntimeError("Redis caído"),
        ):
            respuesta = self.cliente.post(
                self.IMP,
                {"consulta": "mercado", "ciudad": "La Paz", "limite": 5},
                format="json",
            )
        self.assertEqual(
            respuesta.status_code, status.HTTP_503_SERVICE_UNAVAILABLE
        )
        importacion = ImportacionLugares.objects.get()
        self.assertEqual(importacion.estado, "error")
        self.assertIn("Redis caído", importacion.error)
        self.buscar.assert_not_called()

    def test_fallo_de_fuente_marca_error_en_la_importacion(self) -> None:
        self.cliente.force_authenticate(user=self.admin)
        with mock.patch(
            "conocimiento.tasks.importar_lugares_abiertos_task.delay"
        ) as enviar:
            self.cliente.post(
                self.IMP,
                {"consulta": "mercado", "ciudad": "La Paz", "limite": 5},
                format="json",
            )
        self.buscar.side_effect = RuntimeError("fuente caída")
        argumentos = enviar.call_args.kwargs
        with self.assertRaises(RuntimeError):
            importar_lugares_abiertos_task.run(**argumentos)
        importacion = ImportacionLugares.objects.get()
        self.assertEqual(importacion.estado, "error")
        self.assertIn("fuente caída", importacion.error)

    def test_flujo_admin_hasta_cita_rag(self) -> None:
        importacion = self._crear_importacion()
        id_importacion = importacion["id_importacion"]
        respuesta = self.cliente.get(f"{self.IMP}{id_importacion}/candidatos/")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(respuesta.data), 1)
        id_candidato = respuesta.data[0]["id_candidato"]

        with on_commit_inmediato(), mock.patch(
            "conocimiento.tasks.vectorizar_importacion_task.delay"
        ):
            aprobacion = self.cliente.post(
                f"{self.CAND}{id_candidato}/aprobar/",
                {"categoria": "Compras", "duracion_minutos": 45},
                format="json",
            )
        self.assertEqual(aprobacion.status_code, status.HTTP_200_OK)
        id_atractivo = aprobacion.data["id_atractivo"]

        with on_commit_inmediato(), mock.patch(
            "conocimiento.tasks.vectorizar_importacion_task.delay"
        ):
            vectorizacion = self.cliente.post(
                f"{self.IMP}{id_importacion}/vectorizar/", format="json"
            )
        self.assertEqual(vectorizacion.status_code, status.HTTP_202_ACCEPTED)

        fragmento = FragmentoDocumental.objects.get()
        fragmento.embedding = _vector()
        fragmento.embedding_modelo = "embeddinggemma:300m"
        fragmento.embedding_dimension = 768
        fragmento.save()

        class ClienteFalso:
            def embeddings(self, textos):
                return [_vector() for _ in textos]

            def chat(self, mensajes):
                return "El Mercado de las Brujas está en el centro de La Paz."

        with mock.patch(
            "conocimiento.views.ClienteOllama", return_value=ClienteFalso()
        ):
            consulta = self.cliente.post(
                "/api/conocimiento/consultar/",
                {
                    "pregunta": "¿Dónde está el mercado?",
                    "id_atractivo": id_atractivo,
                    "top_k": 1,
                },
                format="json",
            )
        self.assertEqual(consulta.status_code, status.HTTP_200_OK)
        self.assertEqual(consulta.data["origen"], "rag")
        self.assertEqual(len(consulta.data["citas"]), 1)
        self.assertEqual(
            consulta.data["citas"][0]["id_fuente"], aprobacion.data["id_fuente"]
        )

    def test_turista_no_puede_usar_el_panel(self) -> None:
        importacion = self._crear_importacion()
        self.cliente.force_authenticate(user=self.turista)
        id_importacion = importacion["id_importacion"]
        id_candidato = LugarCandidato.objects.get().id_candidato
        rutas = (
            ("get", self.IMP),
            ("post", self.IMP),
            ("get", f"{self.IMP}{id_importacion}/"),
            ("get", f"{self.IMP}{id_importacion}/candidatos/"),
            ("post", f"{self.IMP}{id_importacion}/vectorizar/"),
            ("post", f"{self.CAND}{id_candidato}/aprobar/"),
            ("post", f"{self.CAND}{id_candidato}/rechazar/"),
        )
        for metodo, ruta in rutas:
            with self.subTest(metodo=metodo, ruta=ruta):
                respuesta = getattr(self.cliente, metodo)(
                    ruta, {"consulta": "mercado"}, format="json"
                )
                self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)

    def test_valida_cuerpo_y_rechaza_candidato_aprobado(self) -> None:
        importacion = self._crear_importacion()
        self.assertEqual(
            self.cliente.post(
                self.IMP, {"consulta": "ab"}, format="json"
            ).status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        candidato = LugarCandidato.objects.get()
        with on_commit_inmediato(), mock.patch(
            "conocimiento.tasks.vectorizar_importacion_task.delay"
        ):
            self.cliente.post(
                f"{self.CAND}{candidato.id_candidato}/aprobar/",
                {"categoria": "Compras", "duracion_minutos": 45},
                format="json",
            )
        respuesta = self.cliente.post(
            f"{self.CAND}{candidato.id_candidato}/rechazar/",
            {"notas": "ya publicado"},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            self.cliente.get(
                f"{self.IMP}{importacion['id_importacion']}/"
            ).status_code,
            status.HTTP_200_OK,
        )
