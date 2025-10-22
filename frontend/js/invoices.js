/**
 * Invoice Management - COMPLETE VERSION
 */

let currentInvoiceId = null;
let invoiceItems = [];

/**
 * Load all invoices
 */
async function loadInvoices(filters = {}) {
    const tableBody = document.querySelector('#invoices-table tbody');
    const loading = document.getElementById('invoices-loading');
    const emptyState = document.getElementById('invoices-empty');

    try {
        console.log('Loading invoices...');
        
        if (loading) loading.style.display = 'flex';
        if (tableBody) tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'none';

        const response = await api.getInvoices(filters);
        
        console.log('Invoices loaded:', response);
        
        if (loading) loading.style.display = 'none';

        if (response.invoices && response.invoices.length > 0) {
            response.invoices.forEach(invoice => {
                const row = createInvoiceRow(invoice);
                if (tableBody) tableBody.appendChild(row);
            });
        } else {
            if (emptyState) emptyState.style.display = 'flex';
        }

    } catch (error) {
        console.error('Load invoices error:', error);
        if (loading) loading.style.display = 'none';
        showToast('Failed to load invoices: ' + error.message, 'error');
    }
}

/**
 * Create invoice table row
 */
function createInvoiceRow(invoice) {
    const tr = document.createElement('tr');
    
    const statusClass = invoice.payment_received ? 'paid' : 'unpaid';
    const statusText = invoice.payment_received ? 'Paid' : 'Unpaid';

    tr.innerHTML = `
        <td>#${invoice.id}</td>
        <td>${invoice.customer_name || 'N/A'}</td>
        <td>${formatDate(invoice.invoice_date)}</td>
        <td>${formatCurrency(invoice.total_amount)}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
            <div class="action-buttons">
                <button class="action-btn action-btn-view" onclick="viewInvoice(${invoice.id})">View</button>
                ${!invoice.payment_received ? `
                    <button class="action-btn action-btn-edit" onclick="editInvoice(${invoice.id})">Edit</button>
                    <button class="action-btn action-btn-success" onclick="showPaymentModal(${invoice.id}, ${invoice.total_amount})">Pay</button>
                ` : ''}
                <button class="action-btn action-btn-view" onclick="generateInvoicePDF(${invoice.id})">PDF</button>
                <button class="action-btn action-btn-delete" onclick="deleteInvoice(${invoice.id})">Delete</button>
            </div>
        </td>
    `;

    return tr;
}

/**
 * Filter invoices
 */
async function filterInvoices() {
    const statusFilter = document.getElementById('invoice-status-filter');
    const customerFilter = document.getElementById('invoice-customer-filter');
    const dateFromFilter = document.getElementById('invoice-date-from');
    const dateToFilter = document.getElementById('invoice-date-to');
    
    const filters = {
        status: statusFilter ? statusFilter.value : '',
        customer_name: customerFilter ? customerFilter.value : '',
        date_from: dateFromFilter ? dateFromFilter.value : '',
        date_to: dateToFilter ? dateToFilter.value : ''
    };

    await loadInvoices(filters);
}

/**
 * Clear invoice filters
 */
function clearInvoiceFilters() {
    const statusFilter = document.getElementById('invoice-status-filter');
    const customerFilter = document.getElementById('invoice-customer-filter');
    const dateFromFilter = document.getElementById('invoice-date-from');
    const dateToFilter = document.getElementById('invoice-date-to');
    
    if (statusFilter) statusFilter.value = '';
    if (customerFilter) customerFilter.value = '';
    if (dateFromFilter) dateFromFilter.value = '';
    if (dateToFilter) dateToFilter.value = '';
    
    loadInvoices();
}

/**
 * Show create invoice modal - COMPLETE IMPLEMENTATION
 */
async function showCreateInvoiceModal() {
    currentInvoiceId = null;
    invoiceItems = [];
    
    const modal = document.getElementById('invoiceModal');
    const modalTitle = document.getElementById('invoiceModalTitle');
    const form = document.getElementById('invoiceForm');
    
    if (!modal) {
        showToast('Invoice modal not found', 'error');
        return;
    }
    
    if (modalTitle) modalTitle.textContent = 'Create Invoice';
    if (form) form.reset();
    
    const invoiceIdInput = document.getElementById('invoice-id');
    if (invoiceIdInput) invoiceIdInput.value = '';
    
    const itemsContainer = document.getElementById('invoice-items-container');
    if (itemsContainer) itemsContainer.innerHTML = '';
    
    // Load customers into dropdown
    await loadCustomersDropdown();
    
    // Set current date
    const today = new Date().toISOString().split('T')[0];
    const invoiceDateInput = document.getElementById('invoice-date');
    if (invoiceDateInput) invoiceDateInput.value = today;
    
    updateInvoiceTotals();
    modal.classList.add('active');
}

/**
 * Close invoice modal
 */
function closeInvoiceModal() {
    const modal = document.getElementById('invoiceModal');
    if (modal) modal.classList.remove('active');
}

/**
 * Load customers for dropdown
 */
async function loadCustomersDropdown() {
    try {
        const response = await api.getCustomers();
        const select = document.getElementById('invoice-customer');
        
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Customer</option>';
        
        if (response.customers) {
            response.customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Load customers error:', error);
        showToast('Failed to load customers', 'error');
    }
}

/**
 * Add invoice item
 */
async function addInvoiceItem() {
    const container = document.getElementById('invoice-items-container');
    if (!container) return;
    
    const index = invoiceItems.length;
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'invoice-item';
    itemDiv.dataset.index = index;
    
    // Load products for dropdown
    try {
        const productsResponse = await api.getProducts();
        const products = productsResponse.products || [];
        
        itemDiv.innerHTML = `
            <div class="form-group">
                <label>Product</label>
                <select class="item-product" onchange="selectProduct(${index})" required>
                    <option value="">Select Product</option>
                    ${products.map(p => `<option value="${p.id}" data-price="${p.default_price}" data-tax="${p.default_tax_rate}" data-name="${p.name}">${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" class="item-quantity" min="1" value="1" oninput="calculateItemTotal(${index})" required>
            </div>
            <div class="form-group">
                <label>Price</label>
                <input type="number" class="item-price" step="0.01" min="0" oninput="calculateItemTotal(${index})" required>
            </div>
            <div class="form-group">
                <label>Tax (%)</label>
                <input type="number" class="item-tax" step="0.01" min="0" value="18" oninput="calculateItemTotal(${index})">
            </div>
            <div class="form-group">
                <label>Total</label>
                <input type="text" class="item-total" readonly value="0.00">
            </div>
            <button type="button" class="btn-danger btn-icon" onclick="removeInvoiceItem(${index})">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        container.appendChild(itemDiv);
        
        invoiceItems.push({
            product_id: null,
            product_name: '',
            serial_number: '',
            warranty: '',
            quantity: 1,
            price: 0,
            tax_rate: 18,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: 0
        });
    } catch (error) {
        console.error('Add item error:', error);
        showToast('Failed to add item', 'error');
    }
}

/**
 * Select product and populate fields
 */
function selectProduct(index) {
    const itemDiv = document.querySelector(`[data-index="${index}"]`);
    if (!itemDiv) return;
    
    const select = itemDiv.querySelector('.item-product');
    const option = select.selectedOptions[0];
    
    if (option.value) {
        const price = parseFloat(option.dataset.price || 0);
        const tax = parseFloat(option.dataset.tax || 18);
        const name = option.dataset.name || option.text;
        
        itemDiv.querySelector('.item-price').value = price.toFixed(2);
        itemDiv.querySelector('.item-tax').value = tax.toFixed(2);
        
        invoiceItems[index].product_id = parseInt(option.value);
        invoiceItems[index].product_name = name;
        
        calculateItemTotal(index);
    }
}

/**
 * Calculate item total
 */
function calculateItemTotal(index) {
    const itemDiv = document.querySelector(`[data-index="${index}"]`);
    if (!itemDiv) return;
    
    const quantity = parseFloat(itemDiv.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(itemDiv.querySelector('.item-price').value) || 0;
    const taxRate = parseFloat(itemDiv.querySelector('.item-tax').value) || 0;
    
    const subtotal = quantity * price;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    itemDiv.querySelector('.item-total').value = total.toFixed(2);
    
    // Update invoice items array
    const cgst = taxAmount / 2;
    const sgst = taxAmount / 2;
    
    invoiceItems[index].quantity = quantity;
    invoiceItems[index].price = price;
    invoiceItems[index].tax_rate = taxRate;
    invoiceItems[index].cgst = cgst;
    invoiceItems[index].sgst = sgst;
    invoiceItems[index].total = total;
    
    updateInvoiceTotals();
}

/**
 * Remove invoice item
 */
function removeInvoiceItem(index) {
    const itemDiv = document.querySelector(`[data-index="${index}"]`);
    if (itemDiv) itemDiv.remove();
    
    invoiceItems.splice(index, 1);
    
    // Re-index remaining items
    document.querySelectorAll('.invoice-item').forEach((item, i) => {
        item.dataset.index = i;
    });
    
    updateInvoiceTotals();
}

/**
 * Update invoice totals
 */
function updateInvoiceTotals() {
    let subtotal = 0;
    let taxTotal = 0;
    
    invoiceItems.forEach(item => {
        const itemSubtotal = item.quantity * item.price;
        subtotal += itemSubtotal;
        taxTotal += item.cgst + item.sgst + item.igst;
    });
    
    const total = subtotal + taxTotal;
    
    const subtotalEl = document.getElementById('invoice-subtotal');
    const taxEl = document.getElementById('invoice-tax');
    const totalEl = document.getElementById('invoice-total');
    
    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (taxEl) taxEl.textContent = formatCurrency(taxTotal);
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

/**
 * Handle invoice form submission
 */
const invoiceForm = document.getElementById('invoiceForm');
if (invoiceForm) {
    invoiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (invoiceItems.length === 0) {
            showToast('Please add at least one item', 'error');
            return;
        }
        
        const customerSelect = document.getElementById('invoice-customer');
        const dateInput = document.getElementById('invoice-date');
        const termsInput = document.getElementById('invoice-payment-terms');
        
        const customerId = customerSelect ? customerSelect.value : null;
        const invoiceDate = dateInput ? dateInput.value : null;
        const paymentTerms = termsInput ? termsInput.value : 'On Receipt';
        
        if (!customerId) {
            showToast('Please select a customer', 'error');
            return;
        }
        
        if (!invoiceDate) {
            showToast('Please select invoice date', 'error');
            return;
        }
        
        const invoiceData = {
            customer_id: parseInt(customerId),
            invoice_date: invoiceDate,
            payment_terms: paymentTerms,
            items: invoiceItems
        };
        
        try {
            let response;
            if (currentInvoiceId) {
                response = await api.updateInvoice(currentInvoiceId, invoiceData);
            } else {
                response = await api.createInvoice(invoiceData);
            }
            
            if (response.success) {
                showToast(currentInvoiceId ? 'Invoice updated successfully' : 'Invoice created successfully', 'success');
                closeInvoiceModal();
                await loadInvoices();
            }
        } catch (error) {
            console.error('Save invoice error:', error);
            showToast(error.message || 'Failed to save invoice', 'error');
        }
    });
}

/**
 * View invoice details
 */
async function viewInvoice(id) {
    try {
        const response = await api.getInvoice(id);
        if (response.success) {
            const invoice = response.invoice;
            let details = `
Invoice #${invoice.id}
Customer: ${invoice.customer_name}
Date: ${formatDate(invoice.invoice_date)}
Total: ${formatCurrency(invoice.total_amount)}
Status: ${invoice.payment_received ? 'PAID' : 'UNPAID'}

Items:
`;
            if (invoice.items) {
                invoice.items.forEach(item => {
                    details += `- ${item.product_name}: ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.total)}\n`;
                });
            }
            alert(details);
        }
    } catch (error) {
        console.error('View invoice error:', error);
        showToast('Failed to load invoice details', 'error');
    }
}

/**
 * Edit invoice (placeholder)
 */
async function editInvoice(id) {
    showToast('Edit feature coming soon! For now, create a new invoice.', 'info');
}

/**
 * Delete invoice
 */
async function deleteInvoice(id) {
    if (!confirmAction('Are you sure you want to delete this invoice?')) {
        return;
    }
    
    try {
        const response = await api.deleteInvoice(id);
        if (response.success) {
            showToast('Invoice deleted successfully', 'success');
            await loadInvoices();
        }
    } catch (error) {
        console.error('Delete invoice error:', error);
        showToast('Failed to delete invoice: ' + error.message, 'error');
    }
}

/**
 * Show payment modal
 */
function showPaymentModal(invoiceId, amount) {
    const modal = document.getElementById('paymentModal');
    const invoiceIdInput = document.getElementById('payment-invoice-id');
    const amountInput = document.getElementById('payment-amount');
    
    if (invoiceIdInput) invoiceIdInput.value = invoiceId;
    if (amountInput) amountInput.value = amount;
    
    const today = new Date().toISOString().split('T')[0];
    const paymentDateInput = document.getElementById('payment-date');
    if (paymentDateInput) paymentDateInput.value = today;
    
    if (modal) modal.classList.add('active');
}

/**
 * Close payment modal
 */
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.remove('active');
}

/**
 * Handle payment form submission
 */
const paymentForm = document.getElementById('paymentForm');
if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const invoiceIdInput = document.getElementById('payment-invoice-id');
        const paymentDateInput = document.getElementById('payment-date');
        const paymentAmountInput = document.getElementById('payment-amount');
        
        const invoiceId = invoiceIdInput ? invoiceIdInput.value : null;
        const paymentDate = paymentDateInput ? paymentDateInput.value : null;
        const paymentAmount = paymentAmountInput ? paymentAmountInput.value : null;
        
        if (!invoiceId || !paymentDate || !paymentAmount) {
            showToast('Please fill all fields', 'error');
            return;
        }
        
        try {
            const response = await api.recordPayment(invoiceId, {
                payment_date: paymentDate,
                payment_amount: parseFloat(paymentAmount)
            });
            
            if (response.success) {
                showToast('Payment recorded successfully', 'success');
                closePaymentModal();
                await loadInvoices();
            }
        } catch (error) {
            console.error('Record payment error:', error);
            showToast('Failed to record payment: ' + error.message, 'error');
        }
    });
}