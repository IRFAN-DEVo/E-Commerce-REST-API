/**
 * api.js - Core Javascript file for Decoupled Frontend
 * Handles JWT Authentication, Token Storage, and API Fetching
 */

const API_BASE_URL = '/api/v1';

const authAPI = {
    // Check if user is logged in
    isAuthenticated() {
        return !!localStorage.getItem('access_token');
    },

    // Get current access token
    getToken() {
        return localStorage.getItem('access_token');
    },
    
    // Get stored user type
    getUserType() {
        return localStorage.getItem('user_type');
    },

    // Login function
    async login(email, password) {
        try {
            const res = await fetch(`${API_BASE_URL}/accounts/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await res.json();
            
            // Store tokens
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            
            // Fetch and store user profile info (including user_type)
            await this.fetchUserInfo();
            
            return data;
        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    },

    // Fetch user info from profile endpoint and store in localStorage
    async fetchUserInfo() {
        try {
            const res = await this.fetchWithAuth('/accounts/profile/');
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('user_info', JSON.stringify(data));
                localStorage.setItem('user_type', data.user_type);
                return data;
            }
        } catch (e) {
            console.error("Failed to fetch user info:", e);
        }
        return null;
    },
    
    // Get stored user info object
    getUserInfo() {
        const info = localStorage.getItem('user_info');
        return info ? JSON.parse(info) : null;
    },

    // Logout function
    async logout() {
        try {
            const refresh = localStorage.getItem('refresh_token');
            if (refresh) {
                // Optionally call blacklist API
                await fetch(`${API_BASE_URL}/accounts/logout/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh })
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_info');
            localStorage.removeItem('user_type');
            window.location.href = '/login/';
        }
    },

    // Helper wrapper for fetch that auto-injects JWT token
    async fetchWithAuth(endpoint, options = {}) {
        const token = this.getToken();
        
        const headers = {
            'Accept': 'application/json',
            ...(options.headers || {})
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Handle 401 Unauthorized (Token might be expired)
        if (response.status === 401) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
                // Retry with new token
                headers['Authorization'] = `Bearer ${this.getToken()}`;
                response = await fetch(`${API_BASE_URL}${endpoint}`, { ...config, headers });
            } else {
                // Refresh failed, force logout
                this.logout();
            }
        }

        return response;
    },

    // Attempt to refresh the JWT token
    async refreshToken() {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) return false;

        try {
            const res = await fetch(`${API_BASE_URL}/accounts/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('access_token', data.access);
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }
};

// Global helper to show toast messages
function showToast(message, type = 'info') {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `message message-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${iconClass}" aria-hidden="true"></i>
        <span>${message}</span>
        <button class="message-close" onclick="this.parentElement.remove()" aria-label="Dismiss message">
            <i class="fas fa-times" aria-hidden="true"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}
