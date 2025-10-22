/**
 * Invoice Management
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
 * View invoice (placeholder)
 */
async function viewInvoice(id) {
    try {
        const response = await api.getInvoice(id);
        if (response.success) {
            alert(JSON.stringify(response.invoice, null, 2));
        }
    } catch (error) {
        console.error('View invoice error:', error);
        showToast('Failed to load invoice details', 'error');
    }
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

// Placeholder functions for features to be implemented
function showCreateInvoiceModal() {
    showToast('Invoice creation feature coming soon!', 'info');
}

function editInvoice(id) {
    showToast('Invoice editing feature coming soon!', 'info');
}