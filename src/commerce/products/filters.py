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

    # Exact & choice filters (supports both numeric ID and string name)
    category = django_filters.CharFilter(
        method="filter_category"
    )

    brand = django_filters.CharFilter(
        method="filter_brand"
    )

    def filter_category(self, queryset, name, value):
        if not value:
            return queryset
        if str(value).isdigit():
            return queryset.filter(category_id=int(value))
        return queryset.filter(category__name__iexact=value)

    def filter_brand(self, queryset, name, value):
        if not value:
            return queryset
        if str(value).isdigit():
            return queryset.filter(brand_id=int(value))
        return queryset.filter(brand__name__iexact=value)

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