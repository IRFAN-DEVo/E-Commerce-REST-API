import apiClient from './client';

export const ordersApi = {
  async checkout(shippingAddress) {
    const response = await apiClient.post('/orders/checkout/', {
      shipping_address: shippingAddress,
    });
    return response.data;
  },

  async getOrders() {
    const response = await apiClient.get('/orders/orders/');
    return response.data;
  },

  async getMyOrders() {
    return this.getOrders();
  },

  async getOrder(id) {
    const response = await apiClient.get(`/orders/orders/${id}/`);
    return response.data;
  },

  async cancelOrder(id, reason = '') {
    const response = await apiClient.post(`/orders/orders/${id}/cancel/`, {
      reason,
    });
    return response.data;
  },
};
