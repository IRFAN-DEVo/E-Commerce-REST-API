import apiClient from './client';

export const couponsApi = {
  async applyCoupon(orderId, code) {
    const response = await apiClient.post(`/coupons/coupons/apply/${orderId}/`, {
      code,
    });
    return response.data;
  },

  async getCouponUsage() {
    const response = await apiClient.get('/coupons/coupons/usage/');
    return response.data;
  },
};
