from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, DecimalField
from django.db.models.functions import Coalesce
from decimal import Decimal
from typing import Any

from drf_spectacular.utils import extend_schema

from api.v1.products.permissions import IsOwner
from dashboard.services import DashboardService
from orders.models import Order
from products.models import Product

from .serializers import (
    DashboardSerializer,
    FluctuationSerializer,
)


# ==========================================
# Admin Dashboard Overview
# ==========================================

@extend_schema(
    tags=["Dashboard"],
    summary="Admin Dashboard",
    description="Returns overall analytics, statistics, and chart data for the shop owner.",
    responses={200: DashboardSerializer},
)
class DashboardView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsOwner,
    ]

    def get(self, request):
        data: dict[str, Any] = DashboardService.get_dashboard_data()

        # Add chart data
        data['chart_7days'] = DashboardService.get_last7days_chart()
        data['chart_30days'] = DashboardService.get_last30days_chart()
        data['chart_monthly'] = DashboardService.get_monthly_revenue_chart()
        data['chart_orders'] = DashboardService.get_order_status_chart()
        data['chart_payments'] = DashboardService.get_payment_status_chart()

        # Add growth indicators
        data['growth'] = DashboardService.get_growth_data()

        # Add real recent activity stream
        data['recent_activity'] = DashboardService.get_recent_activity()

        # Add recent orders with customer and payment info
        recent_orders = (
            Order.objects
            .select_related('user', 'payment')
            .order_by('-created_at')[:8]
        )
        data['recent_orders'] = [
            {
                "id": o.id,
                "order_number": f"#ORD{o.id:05d}",
                "customer": o.user.get_full_name() or o.user.username,
                "email": o.user.email,
                "total": float(o.total_price),
                "status": o.status,
                "payment_status": getattr(getattr(o, 'payment', None), 'payment_status', 'PENDING'),
                "payment_method": getattr(getattr(o, 'payment', None), 'payment_method', 'COD'),
                "date": o.created_at.strftime("%b %d, %Y"),
                "created_at": o.created_at.isoformat(),
            }
            for o in recent_orders
        ]

        # Add top products
        top_products = Product.objects.annotate(
            total_revenue=Coalesce(
                Sum('orderitem__price', output_field=DecimalField()),
                Decimal('0.00'),
                output_field=DecimalField(),
            ),
            total_sales=Count('orderitem')
        ).select_related('category').order_by('-total_revenue')[:5]

        data['top_products'] = [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category.name if p.category else "Uncategorized",
                "price": float(p.price),
                "revenue": float(getattr(p, 'total_revenue', 0.0)),
                "sales": getattr(p, 'total_sales', 0),
                "stock": p.stock
            }
            for p in top_products
        ]

        serializer = DashboardSerializer(instance=data)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# ==========================================
# Sales Fluctuations
# ==========================================

@extend_schema(
    tags=["Dashboard"],
    summary="Sales Fluctuations",
    description=(
        "Returns sales comparison metrics including "
        "today, yesterday, weekly, monthly, daily growth, and chart data."
    ),
    responses={200: FluctuationSerializer},
)
class FluctuationView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsOwner,
    ]

    def get(self, request):
        data = DashboardService.get_fluctuation_data()

        # Add chart data for the fluctuation dashboard
        data['chart_7days'] = DashboardService.get_last7days_chart()
        data['chart_30days'] = DashboardService.get_last30days_chart()
        data['chart_monthly'] = DashboardService.get_monthly_revenue_chart()
        data['chart_orders'] = DashboardService.get_order_status_chart()
        data['chart_payments'] = DashboardService.get_payment_status_chart()
        data['recent_activity'] = DashboardService.get_recent_activity()

        serializer = FluctuationSerializer(instance=data)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )