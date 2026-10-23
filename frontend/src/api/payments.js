import apiClient from './client';

export const paymentsApi = {
  async createPayment(orderId, paymentMethod = 'COD') {
    const response = await apiClient.post(`/payments/orders/${orderId}/payments/`, {
      payment_method: paymentMethod,
    });
    return response.data;
  },

  async verifyRazorpayPayment(verificationData) {
    const response = await apiClient.post('/payments/razorpay/verify/', verificationData);
    return response.data;
  },

  async getPaymentConfig() {
    const response = await apiClient.get('/payments/config/');
    return response.data;
  },

  async getPayments() {
    const response = await apiClient.get('/payments/payments/');
    return response.data;
  },
};

