import apiClient from './client';

export const productsApi = {
  async getProducts(params = {}) {
    const response = await apiClient.get('/products/products/', { params });
    return response.data;
  },

  async getProduct(id) {
    const response = await apiClient.get(`/products/products/${id}/`);
    return response.data;
  },

  async getCategories() {
    const response = await apiClient.get('/products/categories/');
    return response.data;
  },

  async getBrands() {
    const response = await apiClient.get('/products/brands/');
    return response.data;
  },
};
