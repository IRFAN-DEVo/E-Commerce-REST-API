import apiClient from './client';

export const cartApi = {
  async getCart() {
    const response = await apiClient.get('/cart/cart/');
    return response.data;
  },

  async addToCart(productId, quantity = 1) {
    const response = await apiClient.post('/cart/cart/items/', {
      product: productId,
      quantity,
    });
    return response.data;
  },

  async updateCartItem(itemId, quantity) {
    const response = await apiClient.patch(`/cart/cart/items/${itemId}/update/`, {
      quantity,
    });
    return response.data;
  },

  async deleteCartItem(itemId) {
    const response = await apiClient.delete(`/cart/cart/items/${itemId}/delete/`);
    return response.data;
  },
};
