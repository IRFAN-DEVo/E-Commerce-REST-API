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

  async createProduct(data) {
    const response = await apiClient.post('/products/products/create/', data);
    return response.data;
  },

  async updateProduct(id, data) {
    const response = await apiClient.patch(`/products/products/${id}/update/`, data);
    return response.data;
  },

  async deleteProduct(id) {
    const response = await apiClient.delete(`/products/products/${id}/delete/`);
    return response.data;
  },
};
