import apiClient from './client';

export const authApi = {
  async login(credentials) {
    const response = await apiClient.post('/accounts/login/', credentials);
    return response.data;
  },

  async register(data) {
    const response = await apiClient.post('/accounts/register/', data);
    return response.data;
  },

  async verifyEmail(data) {
    const response = await apiClient.post('/accounts/verify-email/', data);
    return response.data;
  },

  async resendVerificationOtp(data) {
    const response = await apiClient.post('/accounts/resend-verification-otp/', data);
    return response.data;
  },

  async logout(refreshToken) {
    try {
      if (refreshToken) {
        await apiClient.post('/accounts/logout/', { refresh: refreshToken });
      }
    } catch (e) {
      // Ignore token blacklist failures on logout
    }
  },

  async getProfile() {
    const response = await apiClient.get('/accounts/profile/');
    return response.data;
  },

  async forgotPassword(email) {
    const response = await apiClient.post('/accounts/forgot-password/', { email });
    return response.data;
  },

  async verifyOtp(data) {
    const response = await apiClient.post('/accounts/verify-otp/', data);
    return response.data;
  },

  async resetPassword(data) {
    const response = await apiClient.post('/accounts/reset-password/', data);
    return response.data;
  },

  async requestPhoneOtp(data) {
    const response = await apiClient.post('/accounts/phone/request-otp/', data);
    return response.data;
  },

  async verifyPhoneOtp(data) {
    const response = await apiClient.post('/accounts/phone/verify-otp/', data);
    return response.data;
  },

  async resendPhoneOtp(data) {
    const response = await apiClient.post('/accounts/phone/resend-otp/', data);
    return response.data;
  },

  async getPhoneStatus() {
    const response = await apiClient.get('/accounts/phone/status/');
    return response.data;
  },
};
