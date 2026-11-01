from django.urls import path
from . import views

urlpatterns = [
    path("", views.WishlistListView.as_view(), name="wishlist-root"),
    path("wishlist/", views.WishlistListView.as_view(), name="wishlist-list"),
    path("add/", views.CreateWishlistView.as_view(), name="wishlist-add"),
    path("remove/<int:pk>/", views.DeleteWishlistView.as_view(), name="wishlist-delete"),
    path("check/<int:product_id>/", views.CheckWishlistView.as_view(), name="wishlist-check"),
]
