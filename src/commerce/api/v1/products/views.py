from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import generics
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter

from drf_spectacular.utils import extend_schema

from django.db.models import Count
from products.models import Product, Category, Brand
from products.filters import ProductFilter

from .serializers import (
    ProductSerializer,
    CategorySerializer,
    BrandSerializer,
)

from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
)

from .permissions import IsOwner
from .pagination import ProductPagination


# =====================================================
# Categories
# =====================================================


@extend_schema(
    tags=["Categories"],
    summary="Category List",
    description="Returns all product categories.",
    responses={200: CategorySerializer(many=True)},
)
class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.annotate(product_count=Count('products')).order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


@extend_schema(
    tags=["Categories"],
    summary="Category Details",
    description="Returns details of a single category.",
    responses={200: CategorySerializer},
)
class CategoryDetailView(generics.RetrieveAPIView):
    queryset = Category.objects.annotate(product_count=Count('products'))
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]



@extend_schema(
    tags=["Categories"],
    summary="Create Category",
    description="Creates a new category. Owner only.",
    request=CategorySerializer,
    responses={201: CategorySerializer},
)
class CategoryCreateView(generics.CreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsOwner]


@extend_schema(
    tags=["Categories"],
    summary="Update Category",
    description="Updates an existing category. Owner only.",
    request=CategorySerializer,
    responses={200: CategorySerializer},
)
class CategoryUpdateView(generics.UpdateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsOwner]



@extend_schema(
    tags=["Categories"],
    summary="Delete Category",
    description="Deletes a category. Owner only.",
)
class CategoryDestroyView(generics.DestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsOwner]


# =====================================================
# Brands
# =====================================================

@extend_schema(
    tags=["Brands"],
    summary="Brand List",
    description="Returns all brands.",
    responses={200: BrandSerializer(many=True)},
)
class BrandListView(generics.ListAPIView):
    queryset = Brand.objects.annotate(product_count=Count('products')).order_by("name")
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


@extend_schema(
    tags=["Brands"],
    summary="Brand Details",
    description="Returns details of a single brand.",
    responses={200: BrandSerializer},
)
class BrandDetailView(generics.RetrieveAPIView):
    queryset = Brand.objects.annotate(product_count=Count('products'))
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


@extend_schema(
    tags=["Brands"],
    summary="Create Brand",
    description="Creates a new brand. Owner only.",
    request=BrandSerializer,
    responses={201: BrandSerializer},
)
class BrandCreateView(generics.CreateAPIView):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated, IsOwner]


@extend_schema(
    tags=["Brands"],
    summary="Update Brand",
    description="Updates an existing brand. Owner only.",
    request=BrandSerializer,
    responses={200: BrandSerializer},
)
class BrandUpdateView(generics.UpdateAPIView):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated, IsOwner]


@extend_schema(
    tags=["Brands"],
    summary="Delete Brand",
    description="Deletes a brand. Owner only.",
)
class BrandDestroyView(generics.DestroyAPIView):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated, IsOwner]


# =====================================================
# Products
# =====================================================


@extend_schema(
    tags=["Products"],
    summary="Product List",
    description="Returns a paginated list of products with support for filtering, searching and ordering.",
    parameters=[
        OpenApiParameter(
            name="category",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Filter products by category ID.",
        ),
        OpenApiParameter(
            name="brand",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Filter products by brand ID.",
        ),
        OpenApiParameter(
            name="min_price",
            type=float,
            location=OpenApiParameter.QUERY,
            description="Minimum product price.",
        ),
        OpenApiParameter(
            name="max_price",
            type=float,
            location=OpenApiParameter.QUERY,
            description="Maximum product price.",
        ),
        OpenApiParameter(
            name="min_stock",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Minimum available stock.",
        ),
        OpenApiParameter(
            name="max_stock",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Maximum available stock.",
        ),
        OpenApiParameter(
            name="search",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Search by product name, description, category name or brand name.",
        ),
        OpenApiParameter(
            name="ordering",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Order results by price, stock, created_at or updated_at. Prefix with '-' for descending order.",
        ),
        OpenApiParameter(
            name="page",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Page number.",
        ),
        OpenApiParameter(
            name="page_size",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Number of products per page.",
        ),
    ],
    responses={
        200: ProductSerializer(many=True),
    },
)
class ProductListView(generics.ListAPIView):

    queryset = (
        Product.objects
        .select_related("category", "brand")
        .all()
    )

    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = ProductPagination

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_class = ProductFilter

    search_fields = [
        "name",
        "description",
        "category__name",
        "brand__name",
    ]

    ordering_fields = [
        "price",
        "stock",
        "created_at",
        "updated_at",
    ]

    ordering = ["-created_at"]


@extend_schema(
    tags=["Products"],
    summary="Product Details",
    description="Returns details of a single product.",
    responses={200: ProductSerializer},
)
class ProductDetailView(generics.RetrieveAPIView):

    queryset = (
        Product.objects
        .select_related("category", "brand")
    )

    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


@extend_schema(
    tags=["Products"],
    summary="Create Product",
    description="Creates a new product. Owner only.",
    request=ProductSerializer,
    responses={201: ProductSerializer},
)
class ProductCreateView(generics.CreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, IsOwner]


@extend_schema(
    tags=["Products"],
    summary="Update Product",
    description="Updates an existing product. Owner only.",
    request=ProductSerializer,
    responses={200: ProductSerializer},
)
class ProductUpdateView(generics.UpdateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, IsOwner]


@extend_schema(
    tags=["Products"],
    summary="Delete Product",
    description="Deletes a product. Owner only.",
)
class ProductDestroyView(generics.DestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, IsOwner]