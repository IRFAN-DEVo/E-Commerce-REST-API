import apiClient from './client';

export const wishlistApi = {
  async getWishlist() {
    const response = await apiClient.get('/wishlist/wishlist/');
    return response.data;
  },

  async addToWishlist(productId) {
    const response = await apiClient.post('/wishlist/add/', { product: productId });
    return response.data;
  },

  async removeFromWishlist(id) {
    const response = await apiClient.delete(`/wishlist/remove/${id}/`);
    return response.data;
  },
};
