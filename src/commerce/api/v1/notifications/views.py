from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import Notification
from .permissions import IsNotificationOwner
from .serializers import NotificationSerializer
from drf_spectacular.utils import extend_schema


@extend_schema(
    summary="List Notifications",
    description="Retrieve all notifications for the authenticated user.",
    responses={200: NotificationSerializer(many=True)},
    tags=["Notifications"],
)
class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).order_by("-created_at")



@extend_schema(
    summary="Retrieve Notification",
    description="Retrieve a single notification belonging to the authenticated user.",
    responses={200: NotificationSerializer},
    tags=["Notifications"],
)
class NotificationDetailView(generics.RetrieveAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsNotificationOwner,
    ]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


@extend_schema(
    summary="Mark Notification as Read",
    description="Marks a specific notification as read.",
    responses={
        200: {
            "type": "object",
            "properties": {
                "detail": {
                    "type": "string",
                    "example": "Notification marked as read."
                }
            }
        }
    },
    tags=["Notifications"],
)
class MarkNotificationAsReadView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        IsNotificationOwner,
    ]

    def patch(self, request, pk):
        notification = get_object_or_404(
            Notification,
            pk=pk,
            user=request.user,
        )

        self.check_object_permissions(request, notification)

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at"])

        return Response(
            {"detail": "Notification marked as read."},
            status=status.HTTP_200_OK,
        )



@extend_schema(
    summary="Mark All Notifications as Read",
    description="Marks all unread notifications belonging to the authenticated user as read.",
    responses={
        200: {
            "type": "object",
            "properties": {
                "detail": {
                    "type": "string",
                    "example": "All unread notifications marked as read."
                },
                "updated_count": {
                    "type": "integer",
                    "example": 5
                }
            }
        }
    },
    tags=["Notifications"],
)
class MarkAllNotificationsAsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        updated_count = Notification.objects.filter(
            user=request.user,
            is_read=False,
        ).update(
            is_read=True,
            read_at=timezone.now(),
        )

        return Response(
            {
                "detail": "All unread notifications marked as read.",
                "updated_count": updated_count,
            },
            status=status.HTTP_200_OK,
        )


from api.v1.products.permissions import IsOwner

@extend_schema(
    summary="Admin List Notifications",
    description="Retrieve all notifications across the system for admin monitoring.",
    responses={200: NotificationSerializer(many=True)},
    tags=["Notifications"],
)
class AdminNotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Notification.objects.select_related("user").order_by("-created_at")