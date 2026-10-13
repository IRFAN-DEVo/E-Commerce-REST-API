from django.views.generic import TemplateView

class HomeView(TemplateView):
    template_name = "frontend/home.html"

class LoginView(TemplateView):
    template_name = "frontend/login.html"

class RegisterView(TemplateView):
    template_name = "frontend/register.html"

class ProductsView(TemplateView):
    template_name = "frontend/products.html"

class ProductDetailView(TemplateView):
    template_name = "frontend/product_detail.html"

class CategoriesView(TemplateView):
    template_name = "frontend/categories.html"

class CartView(TemplateView):
    template_name = "frontend/cart.html"

class WishlistView(TemplateView):
    template_name = "frontend/wishlist.html"

class OrdersView(TemplateView):
    template_name = "frontend/orders.html"

class ProfileView(TemplateView):
    template_name = "frontend/profile.html"

class ContactView(TemplateView):
    template_name = "frontend/contact.html"

class AdminDashboardView(TemplateView):
    template_name = "frontend/admin_dashboard.html"

class AdminFluctuationsView(TemplateView):
    template_name = "frontend/admin_fluctuations.html"

class AdminProductsView(TemplateView):
    template_name = "frontend/admin_products.html"

class AdminProductFormView(TemplateView):
    template_name = "frontend/admin_product_form.html"

class AdminCategoriesView(TemplateView):
    template_name = "frontend/admin_categories.html"

class AdminCategoryFormView(TemplateView):
    template_name = "frontend/admin_category_form.html"

class AdminBrandsView(TemplateView):
    template_name = "frontend/admin_brands.html"

class AdminBrandFormView(TemplateView):
    template_name = "frontend/admin_brand_form.html"

class AdminImportProductsView(TemplateView):
    template_name = "frontend/admin_import_products.html"

class AdminExportProductsView(TemplateView):
    template_name = "frontend/admin_export_products.html"

class AdminOrdersView(TemplateView):
    template_name = "frontend/admin_orders.html"

class AdminPaymentsView(TemplateView):
    template_name = "frontend/admin_payments.html"

class AdminCouponsView(TemplateView):
    template_name = "frontend/admin_coupons.html"

class AdminCustomersView(TemplateView):
    template_name = "frontend/admin_customers.html"

class AdminNotificationsView(TemplateView):
    template_name = "frontend/admin_notifications.html"
