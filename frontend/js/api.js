/**
 * API Client for Invoice Master
 * Handles all HTTP requests to the backend
 */

class APIClient {
    constructor() {
        // Get base URL from environment or default to current origin
        this.baseURL = window.location.origin + '/api';
        this.token = localStorage.getItem('token');
    }

    /**
     * Get authorization headers
     */
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    /**
     * Clear authentication token
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(options.auth !== false),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            
            // Handle authentication errors
            if (error.message.includes('Authentication') || 
                error.message.includes('token')) {
                this.clearToken();
                window.location.href = '/index.html';
            }
            
            throw error;
        }
    }

    // ============================================
    // AUTHENTICATION ENDPOINTS
    // ============================================

    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            auth: false,
            body: JSON.stringify({ username, password })
        });

        if (data.token) {
            this.setToken(data.token);
        }

        return data;
    }

    async register(username, email, password) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            auth: false,
            body: JSON.stringify({ username, email, password })
        });

        if (data.token) {
            this.setToken(data.token);
        }

        return data;
    }

    async logout() {
        try {
            await this.request('/auth/logout', {
                method: 'POST'
            });
        } finally {
            this.clearToken();
        }
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    async changePassword(currentPassword, newPassword) {
        return await this.request('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    // ============================================
    // INVOICE ENDPOINTS
    // ============================================

    async getInvoices(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/invoices?${params}`);
    }

    async getInvoice(id) {
        return await this.request(`/invoices/${id}`);
    }

    async createInvoice(invoiceData) {
        return await this.request('/invoices', {
            method: 'POST',
            body: JSON.stringify(invoiceData)
        });
    }

    async updateInvoice(id, invoiceData) {
        return await this.request(`/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(invoiceData)
        });
    }

    async deleteInvoice(id) {
        return await this.request(`/invoices/${id}`, {
            method: 'DELETE'
        });
    }

    async recordPayment(id, paymentData) {
        return await this.request(`/invoices/${id}/payment`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    // ============================================
    // CUSTOMER ENDPOINTS
    // ============================================

    async getCustomers(search = '') {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        return await this.request(`/customers${params}`);
    }

    async getCustomer(id) {
        return await this.request(`/customers/${id}`);
    }

    async createCustomer(customerData) {
        return await this.request('/customers', {
            method: 'POST',
            body: JSON.stringify(customerData)
        });
    }

    async updateCustomer(id, customerData) {
        return await this.request(`/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(customerData)
        });
    }

    async deleteCustomer(id) {
        return await this.request(`/customers/${id}`, {
            method: 'DELETE'
        });
    }

    // ============================================
    // PRODUCT ENDPOINTS
    // ============================================

    async getProducts(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/products?${params}`);
    }

    async getProduct(id) {
        return await this.request(`/products/${id}`);
    }

    async createProduct(productData) {
        return await this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    async updateProduct(id, productData) {
        return await this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    }

    async updateStock(id, quantity, operation) {
        return await this.request(`/products/${id}/stock`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity, operation })
        });
    }

    async deleteProduct(id) {
        return await this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    }

    // ============================================
    // SETTINGS ENDPOINTS
    // ============================================

    async getSettings() {
        return await this.request('/settings');
    }

    async getSetting(key) {
        return await this.request(`/settings/${key}`);
    }

    async updateSetting(key, value) {
        return await this.request(`/settings/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value })
        });
    }

    async bulkUpdateSettings(settings) {
        return await this.request('/settings/bulk', {
            method: 'POST',
            body: JSON.stringify({ settings })
        });
    }
}

// Create global API instance
const api = new APIClient();