from __future__ import annotations

from rest_framework.permissions import BasePermission, SAFE_METHODS


class HasRole(BasePermission):
    """Permite acceso si el usuario autenticado tiene al menos uno de los
    roles indicados en ``allowed_codes``.

    Uso::

        permission_classes = [HasRole("ADMIN")]
        permission_classes = [HasRole("ADMIN", "TOURIST")]
    """

    allowed_codes: tuple[str, ...] = ()

    def __init__(self, *codes: str) -> None:
        super().__init__()
        self.allowed_codes = codes

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.roles.filter(codigo__in=self.allowed_codes).exists()


class IsAdmin(HasRole):
    """Atajo: solo usuarios con rol ADMIN."""

    def __init__(self) -> None:
        super().__init__("ADMIN")


class IsTurista(HasRole):
    """Atajo: solo usuarios con rol TOURIST."""

    def __init__(self) -> None:
        super().__init__("TOURIST")


class IsAdminOrReadOnly(BasePermission):
    """Lectura permitida para cualquiera (AllowAny).
    Escritura (POST/PUT/PATCH/DELETE) solo para usuarios con rol ADMIN."""

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.roles.filter(codigo="ADMIN").exists()
