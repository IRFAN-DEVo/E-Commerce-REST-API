from rest_framework import serializers


class DashboardUsersSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    new_customers_today = serializers.IntegerField()

class DashboardProductsSerializer(serializers.Serializer):
    total_categories = serializers.IntegerField()
    total_brands = serializers.IntegerField()
    total_products = serializers.IntegerField()
    active_products = serializers.IntegerField()
    low_stock_products = serializers.IntegerField()
    out_of_stock_products = serializers.IntegerField()

class DashboardOrdersStatusSerializer(serializers.Serializer):
    pending = serializers.IntegerField()
    processing = serializers.IntegerField()
    shipped = serializers.IntegerField()
    delivered = serializers.IntegerField()
    cancelled = serializers.IntegerField()

class DashboardOrdersSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    today = serializers.IntegerField()
    delivered_today = serializers.IntegerField()
    status = DashboardOrdersStatusSerializer()

class DashboardPaymentsStatusSerializer(serializers.Serializer):
    success = serializers.IntegerField()
    pending = serializers.IntegerField()
    failed = serializers.IntegerField()

class DashboardPaymentsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    status = DashboardPaymentsStatusSerializer()

class DashboardRevenueSerializer(serializers.Serializer):
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    today = serializers.DecimalField(max_digits=12, decimal_places=2)
    weekly = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly = serializers.DecimalField(max_digits=12, decimal_places=2)
    yearly = serializers.DecimalField(max_digits=12, decimal_places=2)

class DashboardStatisticsSerializer(serializers.Serializer):
    average_order_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    total_reviews = serializers.IntegerField()

class DashboardCouponsSerializer(serializers.Serializer):
    active = serializers.IntegerField()


class DashboardSerializer(serializers.Serializer):
    users = DashboardUsersSerializer()
    products = DashboardProductsSerializer()
    orders = DashboardOrdersSerializer()
    payments = DashboardPaymentsSerializer()
    revenue = DashboardRevenueSerializer()
    statistics = DashboardStatisticsSerializer()
    coupons = DashboardCouponsSerializer()

    # Dynamic chart data
    chart_7days = serializers.DictField(read_only=True)
    chart_monthly = serializers.DictField(read_only=True)
    chart_orders = serializers.DictField(read_only=True)
    chart_payments = serializers.DictField(read_only=True)
    
    # We also add top_products and recent_orders to this endpoint as they were in the view context
    top_products = serializers.ListField(child=serializers.DictField(), read_only=True)
    recent_orders = serializers.ListField(child=serializers.DictField(), read_only=True)


class FluctuationSerializer(serializers.Serializer):
    today_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    yesterday_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    weekly_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    daily_growth = serializers.DecimalField(max_digits=6, decimal_places=2)

    # Charts for fluctuation
    chart_7days = serializers.DictField(read_only=True)
    chart_monthly = serializers.DictField(read_only=True)
    chart_orders = serializers.DictField(read_only=True)
    chart_payments = serializers.DictField(read_only=True)