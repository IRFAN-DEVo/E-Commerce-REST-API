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

  async getOrder(id) {
    const response = await apiClient.get(`/orders/orders/${id}/`);
    return response.data;
  },

  async cancelOrder(id) {
    const response = await apiClient.patch(`/orders/orders/${id}/cancel/`);
    return response.data;
  },
};
