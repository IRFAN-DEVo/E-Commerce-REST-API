from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Allows access only to shop owners, staff, and superusers.
    Used to restrict sensitive operations like updating payment status.
    """

    message = "Only shop owners (staff/admin) can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "user_type", None) == "owner"
                or request.user.is_staff
                or request.user.is_superuser
            )
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)

