from django.urls import path

from usuarios.views import (
    LoginView,
    LogoutView,
    PasswordChangeView,
    RegisterView,
    TokenRefreshView,
)
from usuarios.views_admin import UsuariosAdminView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path(
        "password/change/",
        PasswordChangeView.as_view(),
        name="auth-password-change",
    ),
    path("usuarios/", UsuariosAdminView.as_view(), name="auth-usuarios-admin"),
]
