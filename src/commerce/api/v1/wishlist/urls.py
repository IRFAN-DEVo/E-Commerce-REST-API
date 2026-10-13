from django.urls import path

from . import views
    
urlpatterns = [
    path("wishlist/", views.WishlistListView.as_view(), name="wishlist-list"),
    path("add/", views.CreateWishlistView.as_view(), name="wishlist-add"),
    path("remove/<int:pk>/", views.DeleteWishlistView.as_view(), name="wishlist-delete"),
]