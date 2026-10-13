from rest_framework.permissions import BasePermission


class IsNotificationOwner(BasePermission):
    """
    Allow access only to the owner of the notification.
    """

    message = "You do not have permission to access this notification."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(obj, "user", None) == request.user
        )