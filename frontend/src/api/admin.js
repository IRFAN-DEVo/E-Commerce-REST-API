import apiClient from './client';

export const adminApi = {
  async getDashboard() {
    const response = await apiClient.get('/dashboard/');
    return response.data;
  },

  async getFluctuations() {
    const response = await apiClient.get('/dashboard/fluctuations/');
    return response.data;
  },

  async getAdminOrders(params = {}) {
    const response = await apiClient.get('/orders/admin/orders/', { params });
    return response.data;
  },

  async getAdminOrderDetail(id) {
    const response = await apiClient.get(`/orders/admin/orders/${id}/`);
    return response.data;
  },

  async updateAdminOrderStatus(id, status) {
    const response = await apiClient.patch(`/orders/admin/orders/${id}/status/`, { status });
    return response.data;
  },

  // Products
  async getAdminProducts(params = {}) {
    const response = await apiClient.get('/products/products/', { params });
    return response.data;
  },

  async getProduct(id) {
    const response = await apiClient.get(`/products/products/${id}/`);
    return response.data;
  },

  async createProduct(data) {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await apiClient.post('/products/products/create/', data, { headers });
    return response.data;
  },

  async updateProduct(id, data) {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await apiClient.patch(`/products/products/${id}/update/`, data, { headers });
    return response.data;
  },

  async deleteProduct(id) {
    const response = await apiClient.delete(`/products/products/${id}/delete/`);
    return response.data;
  },

  async deleteProductImage(id) {
    const response = await apiClient.delete(`/products/images/${id}/delete/`);
    return response.data;
  },

  async downloadProductTemplate() {
    const response = await apiClient.get('/products/template/', {
      responseType: 'blob',
    });
    return response.data;
  },

  async previewProductImport(formData) {
    formData.set('dry_run', 'true');
    const response = await apiClient.post('/products/import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async importProducts(formData) {
    const response = await apiClient.post('/products/import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Customers
  async getCustomers(params = {}) {
    const response = await apiClient.get('/accounts/admin/customers/', { params });
    return response.data;
  },

  // Categories
  async getCategories() {
    const response = await apiClient.get('/products/categories/');
    return response.data;
  },

  async createCategory(data) {
    const response = await apiClient.post('/products/categories/create/', data);
    return response.data;
  },

  async deleteCategory(id) {
    const response = await apiClient.delete(`/products/categories/${id}/delete/`);
    return response.data;
  },

  // Brands
  async getBrands() {
    const response = await apiClient.get('/products/brands/');
    return response.data;
  },

  async createBrand(data) {
    const response = await apiClient.post('/products/brands/create/', data);
    return response.data;
  },

  async deleteBrand(id) {
    const response = await apiClient.delete(`/products/brands/${id}/delete/`);
    return response.data;
  },

  // Coupons
  async getCoupons() {
    const response = await apiClient.get('/coupons/admin/coupons/');
    return response.data;
  },

  async createCoupon(data) {
    const response = await apiClient.post('/coupons/coupons/create/', data);
    return response.data;
  },

  async deleteCoupon(id) {
    const response = await apiClient.delete(`/coupons/coupons/delete/${id}/`);
    return response.data;
  },
};
