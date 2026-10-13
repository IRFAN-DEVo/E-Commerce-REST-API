from django.urls import path
from . import views

urlpatterns = [
    path('', views.HomeView.as_view(), name='frontend-home'),
    path('login/', views.LoginView.as_view(), name='frontend-login'),
    path('register/', views.RegisterView.as_view(), name='frontend-register'),
    path('products/', views.ProductsView.as_view(), name='frontend-products'),
    path('products/<int:pk>/', views.ProductDetailView.as_view(), name='frontend-product-detail'),
    path('categories/', views.CategoriesView.as_view(), name='frontend-categories'),
    path('cart/', views.CartView.as_view(), name='frontend-cart'),
    path('wishlist/', views.WishlistView.as_view(), name='frontend-wishlist'),
    path('orders/', views.OrdersView.as_view(), name='frontend-orders'),
    path('profile/', views.ProfileView.as_view(), name='frontend-profile'),
    path('contact/', views.ContactView.as_view(), name='frontend-contact'),
    
    # Admin Pages
    path('admin-panel/dashboard/', views.AdminDashboardView.as_view(), name='frontend-admin-dashboard'),
    path('admin-panel/fluctuations/', views.AdminFluctuationsView.as_view(), name='frontend-admin-fluctuations'),
    path('admin-panel/products/', views.AdminProductsView.as_view(), name='frontend-admin-products'),
    path('admin-panel/products/create/', views.AdminProductFormView.as_view(), name='frontend-admin-product-create'),
    path('admin-panel/products/<int:pk>/edit/', views.AdminProductFormView.as_view(), name='frontend-admin-product-edit'),
    path('admin-panel/categories/', views.AdminCategoriesView.as_view(), name='frontend-admin-categories'),
    path('admin-panel/categories/create/', views.AdminCategoryFormView.as_view(), name='frontend-admin-category-create'),
    path('admin-panel/categories/<int:pk>/edit/', views.AdminCategoryFormView.as_view(), name='frontend-admin-category-edit'),
    path('admin-panel/brands/', views.AdminBrandsView.as_view(), name='frontend-admin-brands'),
    path('admin-panel/brands/create/', views.AdminBrandFormView.as_view(), name='frontend-admin-brand-create'),
    path('admin-panel/brands/<int:pk>/edit/', views.AdminBrandFormView.as_view(), name='frontend-admin-brand-edit'),
    path('admin-panel/products/import/', views.AdminImportProductsView.as_view(), name='frontend-admin-products-import'),
    path('admin-panel/products/export/', views.AdminExportProductsView.as_view(), name='frontend-admin-products-export'),

    # New Admin Sections
    path('admin-panel/orders/', views.AdminOrdersView.as_view(), name='frontend-admin-orders'),
    path('admin-panel/payments/', views.AdminPaymentsView.as_view(), name='frontend-admin-payments'),
    path('admin-panel/coupons/', views.AdminCouponsView.as_view(), name='frontend-admin-coupons'),
    path('admin-panel/customers/', views.AdminCustomersView.as_view(), name='frontend-admin-customers'),
    path('admin-panel/notifications/', views.AdminNotificationsView.as_view(), name='frontend-admin-notifications'),
]
