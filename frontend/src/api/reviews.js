import apiClient from './client';

export const reviewsApi = {
  async getProductReviews(productId) {
    const response = await apiClient.get(`/reviews/products/${productId}/reviews/`);
    return response.data;
  },

  async createReview(data) {
    const response = await apiClient.post('/reviews/reviews/', data);
    return response.data;
  },
};
