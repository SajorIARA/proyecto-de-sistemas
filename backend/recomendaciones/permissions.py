from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAuthenticatedOwnerOrAdmin(BasePermission):
    """Lectura: cualquier usuario autenticado (el queryset limita a lo
    propio salvo ADMIN). Escritura: solo ADMIN. Nunca anónimos."""

    def has_permission(self, request, view) -> bool:
        from usuarios.permissions import es_admin

        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return es_admin(user)
