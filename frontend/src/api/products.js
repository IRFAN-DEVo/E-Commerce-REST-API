import apiClient from './client';

let categoriesCache = null;
let categoriesCacheTime = 0;
let brandsCache = null;
let brandsCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache lifetime

export const productsApi = {
  async getProducts(params = {}) {
    const response = await apiClient.get('/products/products/', { params });
    return response.data;
  },

  async getProduct(id) {
    const response = await apiClient.get(`/products/products/${id}/`);
    return response.data;
  },

  async getCategories(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && categoriesCache && now - categoriesCacheTime < CACHE_TTL_MS) {
      return categoriesCache;
    }
    const response = await apiClient.get('/products/categories/');
    categoriesCache = response.data;
    categoriesCacheTime = now;
    return response.data;
  },

  async getBrands(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && brandsCache && now - brandsCacheTime < CACHE_TTL_MS) {
      return brandsCache;
    }
    const response = await apiClient.get('/products/brands/');
    brandsCache = response.data;
    brandsCacheTime = now;
    return response.data;
  },

  invalidateCategories() {
    categoriesCache = null;
    categoriesCacheTime = 0;
  },

  invalidateBrands() {
    brandsCache = null;
    brandsCacheTime = 0;
  },
};
