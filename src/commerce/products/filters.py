import django_filters

from .models import Product


class ProductFilter(django_filters.FilterSet):
    # Price Filters
    min_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="gte"
    )

    max_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="lte"
    )

    # Stock Filters
    min_stock = django_filters.NumberFilter(
        field_name="stock",
        lookup_expr="gte"
    )

    max_stock = django_filters.NumberFilter(
        field_name="stock",
        lookup_expr="lte"
    )

    # Exact Filters
    category = django_filters.NumberFilter(
        field_name="category"
    )

    brand = django_filters.NumberFilter(
        field_name="brand"
    )

    class Meta:
        model = Product
        fields = [
            "category",
            "brand",
            "min_price",
            "max_price",
            "min_stock",
            "max_stock",
        ]