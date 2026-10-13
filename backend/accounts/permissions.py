from rest_framework.permissions import BasePermission
from .models import Role


class HasRole(BasePermission):
    """Classe de base : autorise seulement les rôles listés dans allowed_roles."""
    allowed_roles = []

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.allowed_roles
        )


class IsAdmin(HasRole):
    allowed_roles = [Role.ADMIN]


class IsResponsable(HasRole):
    allowed_roles = [Role.RESPONSABLE]


class IsTechnicien(HasRole):
    allowed_roles = [Role.TECHNICIEN]


class IsClient(HasRole):
    allowed_roles = [Role.CLIENT]


class IsAdminOrResponsable(HasRole):
    allowed_roles = [Role.ADMIN, Role.RESPONSABLE]