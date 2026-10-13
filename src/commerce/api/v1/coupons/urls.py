from django.urls import path
from .views import (
    CouponListView, 
    ApplyCouponView, 
    CouponUsageListView, 
    CouponCreateView, 
    CouponUpdateView, 
    CouponDeleteView,
    AdminCouponListView
)

urlpatterns = [
    path("", CouponListView.as_view(), name="coupon-list"),
    path("coupons/apply/<int:order_id>/", ApplyCouponView.as_view(), name="apply-coupon"),
    path("coupons/usage/", CouponUsageListView.as_view(), name="coupon-usage-list"),
    # Owner only
    path("admin/coupons/", AdminCouponListView.as_view(), name="admin-coupon-list"),
    path("coupons/create/", CouponCreateView.as_view(), name="coupon-create"),
    path("coupons/update/<int:pk>/", CouponUpdateView.as_view(), name="coupon-update"),
    path("coupons/delete/<int:pk>/", CouponDeleteView.as_view(), name="coupon-delete"),
]
