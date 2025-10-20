/**
 * Main Dashboard Controller
 */

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = '/index.html';
            return;
        }

        console.log('Token found, verifying with server...');

        // Get current user info
        const response = await api.getCurrentUser();
        if (response.success) {
            displayUserInfo(response.user);
            console.log('User authenticated:', response.user);
        }

        // Load initial data
        await loadInitialData();

    } catch (error) {
        console.error('Authentication error:', error);
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => {
            localStorage.clear();
            window.location.href = '/index.html';
        }, 2000);
    }
});

/**
 * Display user information in navbar
 */
function displayUserInfo(user) {
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userInitials = document.getElementById('userInitials');

    if (userName) userName.textContent = user.username;
    if (userRole) userRole.textContent = user.role === 'admin' ? 'Administrator' : 'User';
    
    // Get initials
    if (userInitials) {
        const initials = user.username.substring(0, 2).toUpperCase();
        userInitials.textContent = initials;
    }
}

/**
 * Load initial data for all tabs
 */
async function loadInitialData() {
    // Set current date as default
    const today = new Date().toISOString().split('T')[0];
    const invoiceDateInput = document.getElementById('invoice-date');
    const paymentDateInput = document.getElementById('payment-date');
    
    if (invoiceDateInput) invoiceDateInput.value = today;
    if (paymentDateInput) paymentDateInput.value = today;

    // Load data based on active tab
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
        const tabName = activeTab.dataset.tab;
        await switchTab(tabName);
    }
}

/**
 * Tab switching logic
 */
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        switchTab(tabName);
    });
});

async function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update active tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    const activePane = document.getElementById(`${tabName}-tab`);
    if (activePane) activePane.classList.add('active');

    // Load data for the active tab
    try {
        switch (tabName) {
            case 'invoices':
                await loadInvoices();
                break;
            case 'customers':
                await loadCustomers();
                break;
            case 'products':
                await loadProducts();
                break;
            case 'settings':
                await loadSettings();
                break;
        }
    } catch (error) {
        console.error('Error loading tab data:', error);
        showToast('Failed to load data', 'error');
    }
}

/**
 * Logout function
 */
async function logout() {
    try {
        await api.logout();
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if API fails
        localStorage.clear();
        window.location.href = '/index.html';
    }
}

/**
 * Toast notification system
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
}

/**
 * Format date
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Confirm dialog
 */
function confirmAction(message) {
    return confirm(message);
}

/**
 * Close modal on outside click
 */
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal === event.target) {
                modal.classList.remove('active');
            }
        });
    }
});