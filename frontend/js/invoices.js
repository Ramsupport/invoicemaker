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
        loading.style.display = 'flex';
        tableBody.innerHTML = '';
        emptyState.style.display = 'none';

        const response = await api.getInvoices(filters);
        
        loading.style.display = 'none';

        if (response.invoices && response.invoices.length > 0) {
            response.invoices.forEach(invoice => {
                const row = createInvoiceRow(invoice);
                tableBody.appendChild(row);
            });
        } else {
            emptyState.style.display = 'flex';
        }

    } catch (error) {
        console.error('Load invoices error:', error);
        loading.style.display = 'none';
        showToast('Failed to load invoices', 'error');
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
                    <button class="action-btn action-btn-success" onclick="showPaymentModal(${invoice.id})">Pay</button>
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
    const filters = {
        status: document.getElementById('invoice-status-filter').value,
        customer_name: document.getElementById('invoice-customer-filter').value,
        date_from: document.getElementById('invoice-date-from').value,
        date_to: document.getElementById('invoice-date-to').value
    };

    await loadInvoices(filters);
}

/**
 * Clear invoice filters
 */
function clearInvoiceFilters() {
    document.getElementById('invoice-status-filter').value = '';
    document.getElementById('invoice-customer-filter').value = '';
    document.getElementById('invoice-date-from').value = '';
    document.getElementById('invoice-date-to').value = '';
    loadInvoices();
}

/**
 * Show create invoice modal
 */
async function showCreateInvoiceModal() {
    currentInvoiceId = null;
    invoiceItems = [];
    
    document.getElementById('invoiceModalTitle').textContent = 'Create Invoice';
    document.getElementById('invoiceForm').reset();
    document.getElementById('invoice-id').value = '';
    document.getElementById('invoice-items-container').innerHTML = '';
    
    // Load customers into dropdown
    await loadCustomersDropdown();
    
    // Set current date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoice-date').value = today;
    
    updateInvoiceTotals();
    document.getElementById('invoiceModal').classList.add('active');
}

/**
 * Close invoice modal
 */
function closeInvoiceModal() {
    document.getElementById('invoiceModal').classList.remove('active');
}

/**
 * Load customers for dropdown
 */
async function loadCustomersDropdown() {
    try {
        const response = await api.getCustomers();
        const select = document.getElementById('invoice-customer');
        
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
    const index = invoiceItems.length;
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'invoice-item';
    itemDiv.dataset.index = index;
    
    // Load products for dropdown
    const productsResponse = await api.getProducts();
    const products = productsResponse.products || [];
    
    itemDiv.innerHTML = `
        <div class="form-group">
            <label>Product</label>
            <select class="item-product" onchange="selectProduct(${index})" required>
                <option value="">Select Product</option>
                ${products.map(p => `<option value="${p.id}" data-price="${p.default_price}" data-tax="${p.default_tax_rate}">${p.name}</option>`).join('')}
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
}

/**
 * Select product and populate fields
 */
function selectProduct(index) {
    const itemDiv = document.querySelector(`[data-index="${index}"]`);
    const select = itemDiv.querySelector('.item-product');
    const option = select.selectedOptions[0];
    
    if (option.value) {
        const price = parseFloat(option.dataset.price);
        const tax = parseFloat(option.dataset.tax);
        
        itemDiv.querySelector('.item-price').value = price.toFixed(2);
        itemDiv.querySelector('.item-tax').value = tax.toFixed(2);
        
        invoiceItems[index].product_id = parseInt(option.value);
        invoiceItems[index].product_name = option.text;
        
        calculateItemTotal(index);
    }
}

/**
 * Calculate item total
 */
function calculateItemTotal(index) {
    const itemDiv = document.querySelector(`[data-index="${index}"]`);
    
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
    itemDiv.remove();
    
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
    
    document.getElementById('invoice-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('invoice-tax').textContent = formatCurrency(taxTotal);
    document.getElementById('invoice-total').textContent = formatCurrency(total);
}

/**
 * Handle invoice form submission
 */
document.getElementById('invoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (invoiceItems.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }
    
    const customerId = document.getElementById('invoice-customer').value;
    const invoiceDate = document.getElementById('invoice-date').value;
    const paymentTerms = document.getElementById('invoice-payment-terms').value;
    
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

/**
 * View invoice details
 */
async function viewInvoice(id) {
    try {
        const response = await api.getInvoice(id);
        if (response.success) {
            alert(JSON.stringify(response.invoice, null, 2));
            // You can create a better view modal here
        }
    } catch (error) {
        console.error('View invoice error:', error);
        showToast('Failed to load invoice details', 'error');
    }
}

/**
 * Edit invoice
 */
async function editInvoice(id) {
    try {
        const response = await api.getInvoice(id);
        if (response.success && response.invoice) {
            const invoice = response.invoice;
            
            // Check if paid
            if (invoice.payment_received) {
                showToast('Cannot edit paid invoice', 'error');
                return;
            }
            
            currentInvoiceId = id;
            invoiceItems = invoice.items.map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                serial_number: item.serial_number || '',
                warranty: item.warranty || '',
                quantity: item.quantity,
                price: item.price,
                tax_rate: ((item.cgst + item.sgst) / (item.quantity * item.price)) * 100,
                cgst: item.cgst,
                sgst: item.sgst,
                igst: item.igst,
                total: item.total
            }));
            
            document.getElementById('invoiceModalTitle').textContent = 'Edit Invoice';
            document.getElementById('invoice-id').value = id;
            document.getElementById('invoice-customer').value = invoice.customer_id;
            document.getElementById('invoice-date').value = invoice.invoice_date;
            document.getElementById('invoice-payment-terms').value = invoice.payment_terms;
            
            await loadCustomersDropdown();
            
            // Populate items
            const container = document.getElementById('invoice-items-container');
            container.innerHTML = '';
            
            // Here you would need to add the items - simplified for brevity
            
            updateInvoiceTotals();
            document.getElementById('invoiceModal').classList.add('active');
        }
    } catch (error) {
        console.error('Edit invoice error:', error);
        showToast('Failed to load invoice', 'error');
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
        showToast('Failed to delete invoice', 'error');
    }
}

/**
 * Show payment modal
 */
function showPaymentModal(invoiceId) {
    document.getElementById('payment-invoice-id').value = invoiceId;
    document.getElementById('paymentForm').reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('payment-date').value = today;
    
    document.getElementById('paymentModal').classList.add('active');
}

/**
 * Close payment modal
 */
function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

/**
 * Handle payment form submission
 */
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const invoiceId = document.getElementById('payment-invoice-id').value;
    const paymentDate = document.getElementById('payment-date').value;
    const paymentAmount = document.getElementById('payment-amount').value;
    
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
        showToast('Failed to record payment', 'error');
    }
});