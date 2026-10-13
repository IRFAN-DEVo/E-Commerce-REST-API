from django.urls import path
from .views import (
    NotificationListView,
    NotificationDetailView,
    MarkNotificationAsReadView,
    MarkAllNotificationsAsReadView,
    AdminNotificationListView,
)

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/<int:pk>/", NotificationDetailView.as_view(), name="notification-detail"),
    path("notifications/<int:pk>/mark-as-read/", MarkNotificationAsReadView.as_view(), name="mark-notification-as-read"),
    path("notifications/mark-all-as-read/", MarkAllNotificationsAsReadView.as_view(), name="mark-all-notifications-as-read"),

    # Admin APIs
    path("admin/notifications/", AdminNotificationListView.as_view(), name="admin-notification-list"),
]