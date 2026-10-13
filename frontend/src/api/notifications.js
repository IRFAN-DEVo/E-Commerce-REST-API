import apiClient from './client';

export const notificationsApi = {
  async getNotifications() {
    const response = await apiClient.get('/notifications/notifications/');
    return response.data;
  },

  async markAsRead(id) {
    const response = await apiClient.post(`/notifications/notifications/${id}/mark-as-read/`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await apiClient.post('/notifications/notifications/mark-all-as-read/');
    return response.data;
  },
};
