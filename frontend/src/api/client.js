import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Public authentication endpoints that should never carry Authorization headers
const isPublicAuthEndpoint = (url) => {
  if (!url) return false;
  return (
    url.includes('/accounts/login/') ||
    url.includes('/accounts/register/') ||
    url.includes('/accounts/verify-email/') ||
    url.includes('/accounts/resend-verification-otp/') ||
    url.includes('/accounts/forgot-password/') ||
    url.includes('/accounts/verify-otp/') ||
    url.includes('/accounts/reset-password/')
  );
};

// Request interceptor: Attach access token only to protected endpoints
apiClient.interceptors.request.use(
  (config) => {
    if (!isPublicAuthEndpoint(config.url)) {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Auto token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on public auth endpoints
    const isAuthEndpoint =
      isPublicAuthEndpoint(originalRequest?.url) ||
      originalRequest?.url?.includes('/accounts/token/refresh/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/accounts/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = data.access;
        localStorage.setItem('access_token', newAccessToken);
        if (data.refresh) {
          localStorage.setItem('refresh_token', data.refresh);
        }
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
