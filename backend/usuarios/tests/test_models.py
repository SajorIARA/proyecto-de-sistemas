from django.test import TestCase

from usuarios.models import Rol, Usuario, UsuarioRol


class ModeloSchemaUsuarioTests(TestCase):
    def test_nombres_de_tabla_coinciden_con_el_esquema(self):
        nombres = {
            "usuario": Usuario,
            "rol": Rol,
            "usuario_rol": UsuarioRol,
        }
        for nombre_tabla, modelo in nombres.items():
            with self.subTest(modelo=modelo.__name__):
                self.assertEqual(
                    modelo._meta.db_table,
                    nombre_tabla,
                )

    def test_rol_y_usuario_son_creables(self):
        rol = Rol.objects.create(codigo="ADMIN", nombre="Administrador")
        usuario = Usuario.objects.create(
            email="admin@example.com",
            password_hash="hash",
            nombre="Admin",
        )
        usuario.roles.add(rol)
        self.assertEqual(usuario.usuario_roles.count(), 1)
        self.assertEqual(rol.usuarios.count(), 1)
