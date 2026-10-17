from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Sum, DecimalField, FloatField, Count, Q
from django.db.models.functions import Coalesce
from django.utils import timezone

from accounts.models import User
from coupons.models import Coupon
from orders.models import Order
from payments.models import Payment
from products.models import Product, Category, Brand
from reviews.models import Review
from notifications.models import Notification


class DashboardService:

    LOW_STOCK_LIMIT = 5

    @staticmethod
    def get_completed_sales_qs(filters=None):
        """
        Returns a QuerySet of Payment records representing completed net sales.
        - Includes successful payments (online or settled COD).
        - Includes delivered COD orders even if payment status was not yet transitioned.
        - Excludes cancelled orders and failed or refunded payments.
        """
        qs = Payment.objects.filter(
            Q(payment_status="SUCCESS") | Q(payment_method="COD", order__status="DELIVERED")
        ).exclude(
            payment_status__in=["FAILED", "REFUNDED"]
        ).exclude(
            order__status="CANCELLED"
        )
        if filters:
            qs = qs.filter(**filters)
        return qs

    @staticmethod
    def get_dashboard_data():
        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)

        # Batch order status counts in 1 group-by query
        order_status_counts = dict(
            Order.objects.values('status')
            .annotate(c=Count('id'))
            .values_list('status', 'c')
        )

        # Batch payment status counts in 1 group-by query
        payment_status_counts = dict(
            Payment.objects.values('payment_status')
            .annotate(c=Count('id'))
            .values_list('payment_status', 'c')
        )

        # Filter customers properly (excluding staff/superusers)
        customer_qs = User.objects.filter(
            user_type="customer",
            is_staff=False,
            is_superuser=False,
        )

        # Completed sales queries with date boundaries
        completed_sales = DashboardService.get_completed_sales_qs()

        today_filter = Q(paid_at__date=today) | Q(paid_at__isnull=True, order__updated_at__date=today)
        weekly_filter = Q(paid_at__date__gte=week_ago) | Q(paid_at__isnull=True, order__updated_at__date__gte=week_ago)
        monthly_filter = (
            Q(paid_at__year=now.year, paid_at__month=now.month)
            | Q(paid_at__isnull=True, order__updated_at__year=now.year, order__updated_at__month=now.month)
        )
        yearly_filter = (
            Q(paid_at__year=now.year)
            | Q(paid_at__isnull=True, order__updated_at__year=now.year)
        )

        return {
            "users": {
                "total_users": customer_qs.count(),
                "new_customers_today": customer_qs.filter(date_joined__date=today).count(),
            },
            "products": {
                "total_categories": Category.objects.count(),
                "total_brands": Brand.objects.count(),
                "total_products": Product.objects.count(),
                "active_products": Product.objects.filter(is_available=True).count(),
                "low_stock_products": Product.objects.filter(
                    stock__lte=DashboardService.LOW_STOCK_LIMIT,
                    stock__gt=0,
                ).count(),
                "out_of_stock_products": Product.objects.filter(
                    Q(stock=0) | Q(stock_status="OUT_OF_STOCK")
                ).count(),
            },
            "orders": {
                "total": Order.objects.count(),
                "today": Order.objects.filter(created_at__date=today).count(),
                "delivered_today": Order.objects.filter(
                    status="DELIVERED",
                    updated_at__date=today,
                ).count(),
                "status": {
                    "pending": order_status_counts.get("PENDING", 0),
                    "processing": order_status_counts.get("PROCESSING", 0),
                    "shipped": order_status_counts.get("SHIPPED", 0),
                    "delivered": order_status_counts.get("DELIVERED", 0),
                    "cancelled": order_status_counts.get("CANCELLED", 0),
                },
            },
            "payments": {
                "total": Payment.objects.count(),
                "status": {
                    "pending": payment_status_counts.get("PENDING", 0),
                    "success": payment_status_counts.get("SUCCESS", 0),
                    "failed": payment_status_counts.get("FAILED", 0),
                    "refunded": payment_status_counts.get("REFUNDED", 0),
                },
            },
            "revenue": {
                "total": completed_sales.aggregate(
                    revenue=Coalesce(Sum("amount"), Decimal("0.00"))
                )["revenue"],
                "today": completed_sales.filter(today_filter).aggregate(
                    total=Coalesce(Sum("amount"), Decimal("0.00"))
                )["total"],
                "weekly": completed_sales.filter(weekly_filter).aggregate(
                    total=Coalesce(Sum("amount"), Decimal("0.00"))
                )["total"],
                "monthly": completed_sales.filter(monthly_filter).aggregate(
                    total=Coalesce(Sum("amount"), Decimal("0.00"))
                )["total"],
                "yearly": completed_sales.filter(yearly_filter).aggregate(
                    total=Coalesce(Sum("amount"), Decimal("0.00"))
                )["total"],
            },
            "statistics": {
                "average_order_value": Order.objects.filter(
                    status="DELIVERED"
                ).aggregate(
                    average=Coalesce(
                        Avg("total_price", output_field=DecimalField()),
                        Decimal("0.00"),
                        output_field=DecimalField(),
                    )
                )["average"],
                "average_rating": Review.objects.aggregate(
                    average=Coalesce(
                        Avg("rating", output_field=FloatField()),
                        0.0,
                        output_field=FloatField(),
                    )
                )["average"],
                "total_reviews": Review.objects.count(),
            },
            "notifications": {
                "total": Notification.objects.count(),
                "unread": Notification.objects.filter(is_read=False).count(),
            },
            "coupons": {
                "active": Coupon.objects.filter(
                    is_active=True,
                    valid_from__lte=now,
                    valid_to__gte=now,
                ).count(),
            },
        }

    # ======================================
    # Growth Indicators (MoM Analytics)
    # ======================================

    @staticmethod
    def get_growth_data():
        now = timezone.now()
        current_year = now.year
        current_month = now.month

        if current_month == 1:
            prev_month = 12
            prev_year = current_year - 1
        else:
            prev_month = current_month - 1
            prev_year = current_year

        # Sales Growth (This Month vs Previous Month)
        cur_month_sales = DashboardService.get_completed_sales_qs().filter(
            Q(paid_at__year=current_year, paid_at__month=current_month)
            | Q(paid_at__isnull=True, order__updated_at__year=current_year, order__updated_at__month=current_month)
        ).aggregate(t=Coalesce(Sum("amount"), Decimal("0.00")))["t"]

        prev_month_sales = DashboardService.get_completed_sales_qs().filter(
            Q(paid_at__year=prev_year, paid_at__month=prev_month)
            | Q(paid_at__isnull=True, order__updated_at__year=prev_year, order__updated_at__month=prev_month)
        ).aggregate(t=Coalesce(Sum("amount"), Decimal("0.00")))["t"]

        if prev_month_sales > Decimal("0.00"):
            sales_growth = round(((cur_month_sales - prev_month_sales) / prev_month_sales) * Decimal("100"), 1)
        elif cur_month_sales > Decimal("0.00"):
            sales_growth = Decimal("100.0")
        else:
            sales_growth = Decimal("0.0")

        # Orders Growth (This Month vs Previous Month)
        cur_month_orders = Order.objects.filter(
            created_at__year=current_year,
            created_at__month=current_month,
        ).count()

        prev_month_orders = Order.objects.filter(
            created_at__year=prev_year,
            created_at__month=prev_month,
        ).count()

        if prev_month_orders > 0:
            orders_growth = round(((Decimal(cur_month_orders) - Decimal(prev_month_orders)) / Decimal(prev_month_orders)) * Decimal("100"), 1)
        elif cur_month_orders > 0:
            orders_growth = Decimal("100.0")
        else:
            orders_growth = Decimal("0.0")

        # Customers Growth (This Month vs Previous Month)
        customer_qs = User.objects.filter(
            user_type="customer",
            is_staff=False,
            is_superuser=False,
        )

        cur_month_customers = customer_qs.filter(
            date_joined__year=current_year,
            date_joined__month=current_month,
        ).count()

        prev_month_customers = customer_qs.filter(
            date_joined__year=prev_year,
            date_joined__month=prev_month,
        ).count()

        if prev_month_customers > 0:
            customers_growth = round(((Decimal(cur_month_customers) - Decimal(prev_month_customers)) / Decimal(prev_month_customers)) * Decimal("100"), 1)
        elif cur_month_customers > 0:
            customers_growth = Decimal("100.0")
        else:
            customers_growth = Decimal("0.0")

        return {
            "sales": {
                "percentage": float(sales_growth),
                "period": "vs last month",
                "current": float(cur_month_sales),
                "previous": float(prev_month_sales),
            },
            "orders": {
                "percentage": float(orders_growth),
                "period": "vs last month",
                "current": cur_month_orders,
                "previous": prev_month_orders,
            },
            "customers": {
                "percentage": float(customers_growth),
                "period": "vs last month",
                "current": cur_month_customers,
                "previous": prev_month_customers,
            },
        }

    # ======================================
    # Sales Fluctuation Analytics
    # ======================================

    @staticmethod
    def get_fluctuation_data():
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)
        week_start = today - timedelta(days=7)
        month_start = today.replace(day=1)

        completed = DashboardService.get_completed_sales_qs()

        today_sales = completed.filter(
            Q(paid_at__date=today) | Q(paid_at__isnull=True, order__updated_at__date=today)
        ).aggregate(t=Coalesce(Sum("amount"), Decimal("0.00")))["t"]

        yesterday_sales = completed.filter(
            Q(paid_at__date=yesterday) | Q(paid_at__isnull=True, order__updated_at__date=yesterday)
        ).aggregate(t=Coalesce(Sum("amount"), Decimal("0.00")))["t"]

        weekly_sales = completed.filter(
            Q(paid_at__date__gte=week_start) | Q(paid_at__isnull=True, order__updated_at__date__gte=week_start)
        ).aggregate(t=Coalesce(Sum("amount"), Decimal("0.00")))["t"]

        monthly_sales = completed.filter(
            Q(paid_at__date__gte=month_start) | Q(paid_at__isnull=True, order__updated_at__date__gte=month_start)
        ).aggregate(t=Coalesce(Sum("amount"), Decimal("0.00")))["t"]

        if yesterday_sales > Decimal("0.00"):
            daily_growth = ((today_sales - yesterday_sales) / yesterday_sales) * Decimal("100")
        else:
            daily_growth = Decimal("0.00")

        return {
            "today_sales": today_sales,
            "yesterday_sales": yesterday_sales,
            "weekly_sales": weekly_sales,
            "monthly_sales": monthly_sales,
            "daily_growth": round(daily_growth, 2),
        }

    # ======================================
    # Real Chart Data: Last 7 Days
    # ======================================

    @staticmethod
    def get_last7days_chart():
        today = timezone.now().date()
        days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
        start_date = days[0]

        completed = DashboardService.get_completed_sales_qs()

        # Batch query for 7-day payments
        rev_by_date = dict(
            completed.filter(
                Q(paid_at__date__gte=start_date) | Q(paid_at__isnull=True, order__updated_at__date__gte=start_date)
            )
            .values('paid_at__date')
            .annotate(total=Sum('amount'))
            .values_list('paid_at__date', 'total')
        )

        # Batch query for 7-day orders
        orders_by_date = dict(
            Order.objects.filter(
                created_at__date__gte=start_date,
            )
            .values('created_at__date')
            .annotate(total=Count('id'))
            .values_list('created_at__date', 'total')
        )

        revenue_data = []
        orders_data = []
        labels = []
        for day in days:
            labels.append(day.strftime('%b %d'))
            revenue_data.append(float(rev_by_date.get(day) or Decimal('0.00')))
            orders_data.append(orders_by_date.get(day, 0))

        return {'labels': labels, 'revenue': revenue_data, 'orders': orders_data, 'period': '7d'}

    # ======================================
    # Real Chart Data: Last 30 Days
    # ======================================

    @staticmethod
    def get_last30days_chart():
        today = timezone.now().date()
        days = [(today - timedelta(days=i)) for i in range(29, -1, -1)]
        start_date = days[0]

        completed = DashboardService.get_completed_sales_qs()

        # Batch query for 30-day payments
        rev_by_date = dict(
            completed.filter(
                Q(paid_at__date__gte=start_date) | Q(paid_at__isnull=True, order__updated_at__date__gte=start_date)
            )
            .values('paid_at__date')
            .annotate(total=Sum('amount'))
            .values_list('paid_at__date', 'total')
        )

        # Batch query for 30-day orders
        orders_by_date = dict(
            Order.objects.filter(
                created_at__date__gte=start_date,
            )
            .values('created_at__date')
            .annotate(total=Count('id'))
            .values_list('created_at__date', 'total')
        )

        revenue_data = []
        orders_data = []
        labels = []
        for day in days:
            labels.append(day.strftime('%b %d'))
            revenue_data.append(float(rev_by_date.get(day) or Decimal('0.00')))
            orders_data.append(orders_by_date.get(day, 0))

        return {'labels': labels, 'revenue': revenue_data, 'orders': orders_data, 'period': '30d'}

    # ======================================
    # Real Chart Data: Monthly Revenue
    # ======================================

    @staticmethod
    def get_monthly_revenue_chart():
        import calendar
        now = timezone.now()
        current_year = now.year

        completed = DashboardService.get_completed_sales_qs()

        monthly_rev = dict(
            completed.filter(
                Q(paid_at__year=current_year) | Q(paid_at__isnull=True, order__updated_at__year=current_year)
            )
            .values('paid_at__month')
            .annotate(total=Sum('amount'))
            .values_list('paid_at__month', 'total')
        )

        monthly_orders = dict(
            Order.objects.filter(
                created_at__year=current_year,
            )
            .values('created_at__month')
            .annotate(total=Count('id'))
            .values_list('created_at__month', 'total')
        )

        months = []
        revenue_data = []
        orders_data = []
        for month in range(1, 13):
            months.append(calendar.month_abbr[month])
            revenue_data.append(float(monthly_rev.get(month) or Decimal('0.00')))
            orders_data.append(monthly_orders.get(month, 0))

        return {'labels': months, 'revenue': revenue_data, 'orders': orders_data, 'year': current_year, 'period': '12m'}

    # ======================================
    # Real Chart Data: Order Status
    # ======================================

    @staticmethod
    def get_order_status_chart():
        statuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
        counts = dict(
            Order.objects.values('status')
            .annotate(c=Count('id'))
            .values_list('status', 'c')
        )
        data = [counts.get(s, 0) for s in statuses]
        return {'labels': ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], 'data': data}

    # ======================================
    # Real Chart Data: Payment Status
    # ======================================

    @staticmethod
    def get_payment_status_chart():
        statuses = [('SUCCESS', 'Successful'), ('PENDING', 'Pending'), ('FAILED', 'Failed'), ('REFUNDED', 'Refunded')]
        labels = [l for _, l in statuses]
        counts = dict(
            Payment.objects.values('payment_status')
            .annotate(c=Count('id'))
            .values_list('payment_status', 'c')
        )
        data = [counts.get(k, 0) for k, _ in statuses]
        return {'labels': labels, 'data': data}

    # ======================================
    # Real Recent Daily Activity Stream
    # ======================================

    @staticmethod
    def get_recent_activity():
        activities = []

        # 1. System Notifications
        notifs = Notification.objects.select_related('user', 'order').order_by('-created_at')[:8]
        for n in notifs:
            activities.append({
                'id': f'notif-{n.id}',
                'type': n.notification_type.lower(),
                'title': n.title,
                'description': n.message,
                'timestamp': n.created_at.isoformat(),
                'time_raw': n.created_at,
            })

        # 2. Recent Customer Orders
        recent_orders = Order.objects.select_related('user').order_by('-created_at')[:5]
        for o in recent_orders:
            cust_name = o.user.get_full_name() or o.user.username
            activities.append({
                'id': f'order-{o.id}',
                'type': 'order_placed',
                'title': f'Order #{o.id} Placed',
                'description': f'{cust_name} placed order #{o.id} ({o.status}) - Rs. {o.total_price}',
                'timestamp': o.created_at.isoformat(),
                'time_raw': o.created_at,
            })

        # 3. Recent Customer Registrations
        recent_users = User.objects.filter(
            user_type='customer',
            is_staff=False,
            is_superuser=False,
        ).order_by('-date_joined')[:5]
        for u in recent_users:
            name = u.get_full_name() or u.username
            activities.append({
                'id': f'user-{u.id}',
                'type': 'welcome',
                'title': 'New Customer Registered',
                'description': f'{name} ({u.email}) joined DjangoMart',
                'timestamp': u.date_joined.isoformat(),
                'time_raw': u.date_joined,
            })

        # Sort all activities chronologically descending
        activities.sort(key=lambda x: x['time_raw'], reverse=True)

        # Deduplicate and return top 6
        seen = set()
        unique_activities = []
        for act in activities:
            key = f"{act['type']}:{act['title']}"
            if key not in seen:
                seen.add(key)
                unique_activities.append({
                    'id': act['id'],
                    'type': act['type'],
                    'title': act['title'],
                    'description': act['description'],
                    'timestamp': act['timestamp'],
                })
            if len(unique_activities) >= 6:
                break

        return unique_activities
