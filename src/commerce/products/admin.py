from django.contrib import admin

from .models import (
    Category,
    Brand,
    Product,
    ProductImage,
    ProductVideo,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
    )

    search_fields = (
        "name",
    )

    ordering = (
        "name",
    )


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
    )

    search_fields = (
        "name",
    )

    ordering = (
        "name",
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "category",
        "brand",
        "price",
        "discount_price",
        "stock",
        "stock_status",
        "is_available",
        "created_at",
    )

    search_fields = (
        "name",
        "description",
    )

    list_filter = (
        "category",
        "brand",
        "stock_status",
        "is_available",
    )

    ordering = (
        "name",
    )


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product",
        "is_primary",
        "created_at",
    )

    search_fields = (
        "product__name",
    )

    list_filter = (
        "is_primary",
    )


@admin.register(ProductVideo)
class ProductVideoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product",
        "title",
        "created_at",
    )

    search_fields = (
        "product__name",
        "title",
    )


