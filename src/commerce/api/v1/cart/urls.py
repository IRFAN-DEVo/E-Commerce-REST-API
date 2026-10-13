from django.urls import path
from . import views

urlpatterns = [
    path('cart/', views.CartView.as_view(), name='api-cart'),
    path('cart/items/', views.AddCartItemView.as_view(), name='add_cart_item'),
    path('cart/items/<int:pk>/', views.CartItemView.as_view(), name='cart_item_detail'),
    path('cart/items/<int:pk>/delete/', views.DeleteCartItemView.as_view(), name='delete_cart_item'),
    path('cart/items/<int:pk>/update/', views.CartItemView.as_view(), name='update_cart_item'),
]
