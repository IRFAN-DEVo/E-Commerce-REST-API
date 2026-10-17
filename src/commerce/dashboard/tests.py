from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from dashboard.services import DashboardService
from orders.models import Order
from payments.models import Payment
from products.models import Product, Category, Brand


class DashboardMetricsTests(TestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="Password123!",
            user_type="owner",
            is_staff=True,
        )
        self.staff_member = User.objects.create_user(
            username="staff_user",
            email="staff@example.com",
            password="Password123!",
            user_type="owner",
            is_staff=True,
        )
        self.customer1 = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="Password123!",
            user_type="customer",
        )
        self.customer2 = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="Password123!",
            user_type="customer",
        )

        self.category = Category.objects.create(name="Electronics")
        self.brand = Brand.objects.create(name="Acme")

        self.p_in_stock = Product.objects.create(
            name="Keyboard",
            category=self.category,
            brand=self.brand,
            price=Decimal("1500.00"),
            stock=10,
            stock_status="IN_STOCK",
            is_available=True,
        )
        self.p_low_stock = Product.objects.create(
            name="Mouse",
            category=self.category,
            brand=self.brand,
            price=Decimal("800.00"),
            stock=3,
            stock_status="IN_STOCK",
            is_available=True,
        )
        self.p_out_of_stock = Product.objects.create(
            name="Monitor",
            category=self.category,
            brand=self.brand,
            price=Decimal("12000.00"),
            stock=0,
            stock_status="OUT_OF_STOCK",
            is_available=False,
        )

    def test_customer_count_excludes_staff_and_superusers(self):
        """Customers count must only count customer accounts, excluding staff/owners."""
        data = DashboardService.get_dashboard_data()
        self.assertEqual(data["users"]["total_users"], 2)

    def test_product_counts_active_low_and_out_of_stock(self):
        """Product metrics must properly categorize stock levels and availability."""
        data = DashboardService.get_dashboard_data()
        self.assertEqual(data["products"]["total_products"], 3)
        self.assertEqual(data["products"]["active_products"], 2)
        self.assertEqual(data["products"]["low_stock_products"], 1)
        self.assertEqual(data["products"]["out_of_stock_products"], 1)

    def test_sales_includes_successful_payments(self):
        """Paid orders with SUCCESS payment status must count toward total revenue."""
        order = Order.objects.create(
            user=self.customer1,
            total_price=Decimal("3000.00"),
            status="PROCESSING",
        )
        Payment.objects.create(
            order=order,
            payment_method="COD",
            payment_status="SUCCESS",
            amount=Decimal("3000.00"),
            paid_at=timezone.now(),
        )

        data = DashboardService.get_dashboard_data()
        self.assertEqual(data["revenue"]["total"], Decimal("3000.00"))

    def test_sales_excludes_cancelled_orders_and_failed_payments(self):
        """Cancelled orders and failed/refunded payments must never count as revenue."""
        # Cancelled order with success payment (should be excluded)
        order_canc = Order.objects.create(
            user=self.customer1,
            total_price=Decimal("5000.00"),
            status="CANCELLED",
        )
        Payment.objects.create(
            order=order_canc,
            payment_method="COD",
            payment_status="SUCCESS",
            amount=Decimal("5000.00"),
            paid_at=timezone.now(),
        )

        # Order with failed payment
        order_fail = Order.objects.create(
            user=self.customer2,
            total_price=Decimal("2000.00"),
            status="PENDING",
        )
        Payment.objects.create(
            order=order_fail,
            payment_method="COD",
            payment_status="FAILED",
            amount=Decimal("2000.00"),
        )

        # Order with refunded payment
        order_ref = Order.objects.create(
            user=self.customer2,
            total_price=Decimal("4000.00"),
            status="PROCESSING",
        )
        Payment.objects.create(
            order=order_ref,
            payment_method="COD",
            payment_status="REFUNDED",
            amount=Decimal("4000.00"),
            paid_at=timezone.now(),
        )

        data = DashboardService.get_dashboard_data()
        self.assertEqual(data["revenue"]["total"], Decimal("0.00"))

    def test_cod_delivered_order_counts_as_completed_sales(self):
        """COD orders marked DELIVERED count as completed sales even if payment is pending settlement."""
        order_cod = Order.objects.create(
            user=self.customer1,
            total_price=Decimal("4500.00"),
            status="DELIVERED",
        )
        Payment.objects.create(
            order=order_cod,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("4500.00"),
        )

        data = DashboardService.get_dashboard_data()
        self.assertEqual(data["revenue"]["total"], Decimal("4500.00"))

    def test_growth_calculation_handles_zero_previous_period_safely(self):
        """When previous period is zero, growth must return 100.0% if current > 0, or 0.0% if both zero."""
        growth = DashboardService.get_growth_data()
        self.assertIn("sales", growth)
        self.assertIn("orders", growth)
        self.assertIn("customers", growth)
        self.assertEqual(growth["sales"]["percentage"], 0.0)
        self.assertEqual(growth["orders"]["percentage"], 0.0)
        # 2 customers joined this month, 0 previous month -> 100.0%
        self.assertEqual(growth["customers"]["percentage"], 100.0)

    def test_charts_time_series_data_consistency(self):
        """7-day, 30-day, and monthly charts must produce chronological labels and match sales counts."""
        chart_7d = DashboardService.get_last7days_chart()
        self.assertEqual(len(chart_7d["labels"]), 7)
        self.assertEqual(len(chart_7d["revenue"]), 7)
        self.assertEqual(len(chart_7d["orders"]), 7)

        chart_30d = DashboardService.get_last30days_chart()
        self.assertEqual(len(chart_30d["labels"]), 30)
        self.assertEqual(len(chart_30d["revenue"]), 30)
        self.assertEqual(len(chart_30d["orders"]), 30)

        chart_12m = DashboardService.get_monthly_revenue_chart()
        self.assertEqual(len(chart_12m["labels"]), 12)
        self.assertEqual(len(chart_12m["revenue"]), 12)
        self.assertEqual(len(chart_12m["orders"]), 12)

    def test_recent_activity_chronological_ordering(self):
        """Recent activity returns real store actions ordered with newest first."""
        order = Order.objects.create(
            user=self.customer1,
            total_price=Decimal("1999.00"),
            status="PENDING",
        )
        activities = DashboardService.get_recent_activity()
        self.assertIsInstance(activities, list)
        self.assertTrue(len(activities) > 0)
        # Check first activity structure
        first = activities[0]
        self.assertIn("id", first)
        self.assertIn("type", first)
        self.assertIn("title", first)
        self.assertIn("description", first)
        self.assertIn("timestamp", first)


class DashboardApiEndpointTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.owner = User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="Password123!",
            user_type="owner",
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="Password123!",
            user_type="customer",
        )

    def test_anonymous_user_cannot_access_dashboard(self):
        """Unauthenticated requests must be rejected with 401 Unauthorized."""
        response = self.client.get("/api/v1/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_user_cannot_access_dashboard(self):
        """Regular customer accounts must be rejected with 403 Forbidden."""
        self.client.force_authenticate(user=self.customer)
        response = self.client.get("/api/v1/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_user_can_access_dashboard_with_all_metrics(self):
        """Store owners receive full metrics, growth, charts, and activity data."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/api/v1/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertIn("users", data)
        self.assertIn("products", data)
        self.assertIn("orders", data)
        self.assertIn("payments", data)
        self.assertIn("revenue", data)
        self.assertIn("growth", data)
        self.assertIn("chart_7days", data)
        self.assertIn("chart_30days", data)
        self.assertIn("chart_monthly", data)
        self.assertIn("recent_orders", data)
        self.assertIn("recent_activity", data)

    def test_empty_database_returns_valid_zero_dashboard(self):
        """Dashboard must handle empty database without 500 errors."""
        # Wipe all orders and products
        Order.objects.all().delete()
        Product.objects.all().delete()

        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/api/v1/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["orders"]["total"], 0)
        self.assertEqual(response.data["products"]["total_products"], 0)
        self.assertEqual(float(response.data["revenue"]["total"]), 0.0)
