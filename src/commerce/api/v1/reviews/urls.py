from django.urls import path
from . import views

urlpatterns = [
    path("reviews/", views.CreateReviewView.as_view(), name="review-list-create"),
    path("products/<int:product_id>/reviews/", views.ProductReviewListView.as_view(), name="product-review-list"),
    path("reviews/<int:pk>/update/", views.UpdateReviewView.as_view(), name="review-update"),
    path("reviews/<int:pk>/delete/", views.DeleteReviewView.as_view(), name="review-delete")
]