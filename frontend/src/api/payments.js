import apiClient from './client';

export const paymentsApi = {
  async createPayment(orderId, paymentMethod = 'COD') {
    const response = await apiClient.post(`/payments/orders/${orderId}/payments/`, {
      payment_method: paymentMethod,
    });
    return response.data;
  },

  async getPayments() {
    const response = await apiClient.get('/payments/payments/');
    return response.data;
  },
};
