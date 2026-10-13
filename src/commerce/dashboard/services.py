from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Sum, DecimalField, FloatField
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
    def get_dashboard_data():

        now = timezone.now()
        today = now.date()

        week_ago = today - timedelta(days=7)


        return {


            "users": {

                "total_users": User.objects.filter(
                    user_type="customer"
                ).count(),


                "new_customers_today": User.objects.filter(
                    user_type="customer",
                    date_joined__date=today,
                ).count(),
            },



            "products": {

                "total_categories": Category.objects.count(),

                "total_brands": Brand.objects.count(),

                "total_products": Product.objects.count(),


                "active_products": Product.objects.filter(
                    is_available=True
                ).count(),


                "low_stock_products": Product.objects.filter(
                    stock__lte=DashboardService.LOW_STOCK_LIMIT,
                    stock__gt=0,
                ).count(),


                "out_of_stock_products": Product.objects.filter(
                    stock=0
                ).count(),
            },



            "orders": {

                "total": Order.objects.count(),


                "today": Order.objects.filter(
                    created_at__date=today
                ).count(),


                "delivered_today": Order.objects.filter(
                    status="DELIVERED",
                    updated_at__date=today,
                ).count(),


                "status": {

                    "pending": Order.objects.filter(
                        status="PENDING"
                    ).count(),


                    "processing": Order.objects.filter(
                        status="PROCESSING"
                    ).count(),


                    "shipped": Order.objects.filter(
                        status="SHIPPED"
                    ).count(),


                    "delivered": Order.objects.filter(
                        status="DELIVERED"
                    ).count(),


                    "cancelled": Order.objects.filter(
                        status="CANCELLED"
                    ).count(),
                },
            },



            "payments": {

                "total": Payment.objects.count(),


                "status": {

                    "pending": Payment.objects.filter(
                        payment_status="PENDING"
                    ).count(),


                    "success": Payment.objects.filter(
                        payment_status="SUCCESS"
                    ).count(),


                    "failed": Payment.objects.filter(
                        payment_status="FAILED"
                    ).count(),


                    "refunded": Payment.objects.filter(
                        payment_status="REFUNDED"
                    ).count(),
                },
            },



            "revenue": {

                "total": Payment.objects.filter(
                    payment_status="SUCCESS"
                ).aggregate(
                    revenue=Coalesce(
                        Sum("amount"),
                        Decimal("0.00"),
                    )
                )["revenue"],



                "today": Payment.objects.filter(
                    payment_status="SUCCESS",
                    paid_at__date=today,
                ).aggregate(
                    total=Coalesce(
                        Sum("amount"),
                        Decimal("0.00"),
                    )
                )["total"],



                "weekly": Payment.objects.filter(
                    payment_status="SUCCESS",
                    paid_at__date__gte=week_ago,
                ).aggregate(
                    total=Coalesce(
                        Sum("amount"),
                        Decimal("0.00"),
                    )
                )["total"],



                "monthly": Payment.objects.filter(
                    payment_status="SUCCESS",
                    paid_at__year=now.year,
                    paid_at__month=now.month,
                ).aggregate(
                    total=Coalesce(
                        Sum("amount"),
                        Decimal("0.00"),
                    )
                )["total"],



                "yearly": Payment.objects.filter(
                    payment_status="SUCCESS",
                    paid_at__year=now.year,
                ).aggregate(
                    total=Coalesce(
                        Sum("amount"),
                        Decimal("0.00"),
                    )
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


                "unread": Notification.objects.filter(
                    is_read=False
                ).count(),
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
    # Sales Fluctuation Analytics
    # ======================================

    @staticmethod
    def get_fluctuation_data():

        today = timezone.now().date()


        yesterday = (
            today - timedelta(days=1)
        )


        week_start = (
            today - timedelta(days=7)
        )


        month_start = today.replace(
            day=1
        )


        def get_sales(filters):

            return Payment.objects.filter(
                payment_status="SUCCESS",
                **filters
            ).aggregate(
                total=Coalesce(
                    Sum("amount"),
                    Decimal("0.00"),
                )
            )["total"]



        today_sales = get_sales(
            {
                "paid_at__date": today
            }
        )


        yesterday_sales = get_sales(
            {
                "paid_at__date": yesterday
            }
        )


        weekly_sales = get_sales(
            {
                "paid_at__date__gte": week_start
            }
        )


        monthly_sales = get_sales(
            {
                "paid_at__date__gte": month_start
            }
        )


        if yesterday_sales > 0:

            daily_growth = (
                (
                    today_sales - yesterday_sales
                )
                /
                yesterday_sales
            ) * 100

        else:

            daily_growth = Decimal("0.00")



        return {

            "today_sales": today_sales,

            "yesterday_sales": yesterday_sales,

            "weekly_sales": weekly_sales,

            "monthly_sales": monthly_sales,

            "daily_growth": round(
                daily_growth,
                2
            ),
        }

    # ======================================
    # Real Chart Data: Last 7 Days (per day)
    # ======================================

    @staticmethod
    def get_last7days_chart():
        today = timezone.now().date()
        days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
        revenue_data = []
        orders_data = []
        labels = []
        for day in days:
            labels.append(day.strftime('%b %d'))
            rev = Payment.objects.filter(
                payment_status='SUCCESS',
                paid_at__date=day,
            ).aggregate(
                total=Coalesce(Sum('amount'), Decimal('0.00'), output_field=DecimalField())
            )['total']
            revenue_data.append(float(rev))
            ord_count = Order.objects.filter(created_at__date=day).count()
            orders_data.append(ord_count)
        return {'labels': labels, 'revenue': revenue_data, 'orders': orders_data}

    @staticmethod
    def get_monthly_revenue_chart():
        import calendar
        now = timezone.now()
        current_year = now.year
        months = []
        revenue_data = []
        for month in range(1, 13):
            months.append(calendar.month_abbr[month])
            rev = Payment.objects.filter(
                payment_status='SUCCESS',
                paid_at__year=current_year,
                paid_at__month=month,
            ).aggregate(
                total=Coalesce(Sum('amount'), Decimal('0.00'), output_field=DecimalField())
            )['total']
            revenue_data.append(float(rev))
        return {'labels': months, 'revenue': revenue_data, 'year': current_year}

    @staticmethod
    def get_order_status_chart():
        statuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
        data = [Order.objects.filter(status=s).count() for s in statuses]
        return {'labels': ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], 'data': data}

    @staticmethod
    def get_payment_status_chart():
        statuses = [('SUCCESS','Successful'),('PENDING','Pending'),('FAILED','Failed'),('REFUNDED','Refunded')]
        labels = [l for _,l in statuses]
        data = [Payment.objects.filter(payment_status=k).count() for k,_ in statuses]
        return {'labels': labels, 'data': data}