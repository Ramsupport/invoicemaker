/**
 * Customer Management
 */

let currentCustomerId = null;

/**
 * Load all customers
 */
async function loadCustomers(search = '') {
    const tableBody = document.querySelector('#customers-table tbody');
    const loading = document.getElementById('customers-loading');

    try {
        loading.style.display = 'flex';
        tableBody.innerHTML = '';

        const response = await api.getCustomers(search);
        
        loading.style.display = 'none';

        if (response.customers && response.customers.length > 0) {
            response.customers.forEach(customer => {
                const row = createCustomerRow(customer);
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        No customers found
                    </td>
                </tr>
            `;
        }

    } catch (error) {
        console.error('Load customers error:', error);
        loading.style.display = 'none';
        showToast('Failed to load customers', 'error');
    }
}

/**
 * Create customer table row
 */
function createCustomerRow(customer) {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
        <td><strong>${customer.name}</strong></td>
        <td>${customer.email || 'N/A'}</td>
        <td>${customer.phone || 'N/A'}</td>
        <td>${customer.gstin || 'N/A'}</td>
        <td>
            <div class="action-buttons">
                <button class="action-btn action-btn-edit" onclick="editCustomer(${customer.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>
                <button class="action-btn action-btn-delete" onclick="deleteCustomer(${customer.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                </button>
            </div>
        </td>
    `;

    return tr;
}

/**
 * Search customers
 */
function searchCustomers() {
    const searchTerm = document.getElementById('customer-search').value;
    loadCustomers(searchTerm);
}

/**
 * Show customer modal for creating new customer
 */
function showCustomerModal() {
    currentCustomerId = null;
    document.getElementById('customerModalTitle').textContent = 'Add Customer';
    document.getElementById('customerForm').reset();
    document.getElementById('customer-id').value = '';
    document.getElementById('customerModal').classList.add('active');
}

/**
 * Close customer modal
 */
function closeCustomerModal() {
    document.getElementById('customerModal').classList.remove('active');
}

/**
 * Handle customer form submission
 */
document.getElementById('customerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const customerData = {
        name: document.getElementById('customer-name').value.trim(),
        email: document.getElementById('customer-email').value.trim(),
        phone: document.getElementById('customer-phone').value.trim(),
        address: document.getElementById('customer-address').value.trim(),
        gstin: document.getElementById('customer-gstin').value.trim()
    };

    try {
        let response;
        if (currentCustomerId) {
            response = await api.updateCustomer(currentCustomerId, customerData);
        } else {
            response = await api.createCustomer(customerData);
        }
        
        if (response.success) {
            showToast(
                currentCustomerId ? 'Customer updated successfully' : 'Customer created successfully',
                'success'
            );
            closeCustomerModal();
            await loadCustomers();
        }
    } catch (error) {
        console.error('Save customer error:', error);
        showToast(error.message || 'Failed to save customer', 'error');
    }
});

/**
 * Edit customer
 */
async function editCustomer(id) {
    try {
        const response = await api.getCustomer(id);
        if (response.success && response.customer) {
            const customer = response.customer;
            
            currentCustomerId = id;
            document.getElementById('customerModalTitle').textContent = 'Edit Customer';
            document.getElementById('customer-id').value = id;
            document.getElementById('customer-name').value = customer.name || '';
            document.getElementById('customer-email').value = customer.email || '';
            document.getElementById('customer-phone').value = customer.phone || '';
            document.getElementById('customer-address').value = customer.address || '';
            document.getElementById('customer-gstin').value = customer.gstin || '';
            
            document.getElementById('customerModal').classList.add('active');
        }
    } catch (error) {
        console.error('Edit customer error:', error);
        showToast('Failed to load customer details', 'error');
    }
}

/**
 * Delete customer
 */
async function deleteCustomer(id) {
    if (!confirmAction('Are you sure you want to delete this customer? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await api.deleteCustomer(id);
        if (response.success) {
            showToast('Customer deleted successfully', 'success');
            await loadCustomers();
        }
    } catch (error) {
        console.error('Delete customer error:', error);
        showToast(error.message || 'Failed to delete customer', 'error');
    }
}