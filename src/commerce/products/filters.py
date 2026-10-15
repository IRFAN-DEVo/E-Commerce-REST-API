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

    # Exact & choice filters
    category = django_filters.NumberFilter(
        field_name="category"
    )

    brand = django_filters.NumberFilter(
        field_name="brand"
    )

    sku = django_filters.CharFilter(
        field_name="sku",
        lookup_expr="icontains"
    )

    stock_status = django_filters.ChoiceFilter(
        field_name="stock_status",
        choices=Product.STOCK_STATUS
    )

    is_available = django_filters.BooleanFilter(
        field_name="is_available"
    )

    class Meta:
        model = Product
        fields = [
            "category",
            "brand",
            "sku",
            "stock_status",
            "is_available",
            "min_price",
            "max_price",
            "min_stock",
            "max_stock",
        ]