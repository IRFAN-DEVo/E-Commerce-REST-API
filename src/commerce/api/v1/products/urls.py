from django.urls import path

from . import views
from .import_export import (
    ProductImportView,
    ProductExportCSVView,
    ProductExportExcelView,
    ProductTemplateView,
)

urlpatterns = [
    path("categories/", views.CategoryListView.as_view(), name="category-list"),
    path("categories/<int:pk>/", views.CategoryDetailView.as_view(), name="category-detail"),
    path("categories/create/", views.CategoryCreateView.as_view(), name="category-create"),
    path("categories/<int:pk>/update/", views.CategoryUpdateView.as_view(), name="category-update"),
    path("categories/<int:pk>/delete/", views.CategoryDestroyView.as_view(), name="category-delete"),
    path("brands/", views.BrandListView.as_view(), name="brand-list"),
    path("brands/<int:pk>/", views.BrandDetailView.as_view(), name="brand-detail"),
    path("brands/create/", views.BrandCreateView.as_view(), name="brand-create"),
    path("brands/<int:pk>/update/", views.BrandUpdateView.as_view(), name="brand-update"),
    path("brands/<int:pk>/delete/", views.BrandDestroyView.as_view(), name="brand-delete"),
    path("products/", views.ProductListView.as_view(), name="product-list"),
    path("products/<int:pk>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("products/create/", views.ProductCreateView.as_view(), name="product-create"),
    path("products/<int:pk>/update/", views.ProductUpdateView.as_view(), name="product-update"),
    path("products/<int:pk>/delete/", views.ProductDestroyView.as_view(), name="product-delete"),
    path("products/images/<int:pk>/delete/", views.ProductImageDestroyView.as_view(), name="product-image-delete"),
    path("products/import/", ProductImportView.as_view(), name="product-import"),
    path("products/export/csv/", ProductExportCSVView.as_view(), name="product-export-csv"),
    path("products/export/excel/", ProductExportExcelView.as_view(), name="product-export-excel"),
    path("products/template/", ProductTemplateView.as_view(), name="product-template"),
]
