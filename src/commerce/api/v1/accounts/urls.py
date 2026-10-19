from django.urls import path
from . import views
from rest_framework_simplejwt.views import (TokenObtainPairView, TokenBlacklistView, TokenRefreshView)
from .views import (
    ForgotPasswordView, 
    VerifyOTPView,
    ResetPasswordView, 
    UserProfileView,
    AdminCustomerListView,
    AdminCustomerDetailView
)

urlpatterns = [
    path('register/', views.SignupView.as_view(), name='user-create'),
    path('verify-email/', views.VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification-otp/', views.ResendVerificationOTPView.as_view(), name='resend-verification-otp'),
    path('login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),

    # Admin APIs
    path('admin/customers/', AdminCustomerListView.as_view(), name='admin-customer-list'),
    path('admin/customers/<int:pk>/', AdminCustomerDetailView.as_view(), name='admin-customer-detail'),
]
