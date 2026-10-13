from django.urls import path

from .admin_views import AdminOrderDetailView, AdminOrderListView, UpdateOrderStatusView
from .views import CheckoutView,OrderListView, OrderDetailView, CancelOrderView

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path("orders/", OrderListView.as_view(), name='order-list'),
    path("orders/<int:pk>/", OrderDetailView.as_view(), name='order-detail'),
    path("orders/<int:pk>/cancel/", CancelOrderView.as_view(), name='cancel-order'),
    path("admin/orders/", AdminOrderListView.as_view()),
    path("admin/orders/<int:pk>/", AdminOrderDetailView.as_view()),
    path("admin/orders/<int:pk>/status/", UpdateOrderStatusView.as_view()),
]