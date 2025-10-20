/**
 * Product Management
 */

let currentProductId = null;

/**
 * Load all products
 */
async function loadProducts() {
    const tableBody = document.querySelector('#products-table tbody');
    const loading = document.getElementById('products-loading');

    try {
        loading.style.display = 'flex';
        tableBody.innerHTML = '';

        const filters = {
            stock_status: document.getElementById('product-stock-filter')?.value || '',
            search: document.getElementById('product-search')?.value || ''
        };

        const response = await api.getProducts(filters);
        
        loading.style.display = 'none';

        if (response.products && response.products.length > 0) {
            response.products.forEach(product => {
                const row = createProductRow(product);
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        No products found
                    </td>
                </tr>
            `;
        }

    } catch (error) {
        console.error('Load products error:', error);
        loading.style.display = 'none';
        showToast('Failed to load products', 'error');
    }
}

/**
 * Create product table row
 */
function createProductRow(product) {
    const tr = document.createElement('tr');
    
    // Determine stock status
    let stockStatus = 'in-stock';
    let stockText = `${product.stock_quantity} units`;
    
    if (product.stock_quantity === 0) {
        stockStatus = 'out-of-stock';
        stockText = 'Out of Stock';
    } else if (product.stock_quantity < 5) {
        stockStatus = 'low-stock';
        stockText = `${product.stock_quantity} units (Low)`;
    }
    
    tr.innerHTML = `
        <td><strong>${product.name}</strong></td>
        <td>${formatCurrency(product.default_price)}</td>
        <td>${product.default_tax_rate}%</td>
        <td><span class="status-badge ${stockStatus}">${stockText}</span></td>
        <td>
            <div class="action-buttons">
                <button class="action-btn action-btn-edit" onclick="editProduct(${product.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>
                <button class="action-btn action-btn-success" onclick="adjustStock(${product.id}, 'add')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Stock
                </button>
                <button class="action-btn action-btn-warning" onclick="adjustStock(${product.id}, 'remove')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Remove
                </button>
                <button class="action-btn action-btn-delete" onclick="deleteProduct(${product.id})">
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
 * Filter products
 */
function filterProducts() {
    loadProducts();
}

/**
 * Show product modal for creating new product
 */
function showProductModal() {
    currentProductId = null;
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-tax-rate').value = '18';
    document.getElementById('product-stock').value = '0';
    document.getElementById('productModal').classList.add('active');
}

/**
 * Close product modal
 */
function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

/**
 * Handle product form submission
 */
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productData = {
        name: document.getElementById('product-name').value.trim(),
        default_price: parseFloat(document.getElementById('product-price').value),
        default_tax_rate: parseFloat(document.getElementById('product-tax-rate').value),
        stock_quantity: parseInt(document.getElementById('product-stock').value)
    };

    try {
        let response;
        if (currentProductId) {
            response = await api.updateProduct(currentProductId, productData);
        } else {
            response = await api.createProduct(productData);
        }
        
        if (response.success) {
            showToast(
                currentProductId ? 'Product updated successfully' : 'Product created successfully',
                'success'
            );
            closeProductModal();
            await loadProducts();
        }
    } catch (error) {
        console.error('Save product error:', error);
        showToast(error.message || 'Failed to save product', 'error');
    }
});

/**
 * Edit product
 */
async function editProduct(id) {
    try {
        const response = await api.getProduct(id);
        if (response.success && response.product) {
            const product = response.product;
            
            currentProductId = id;
            document.getElementById('productModalTitle').textContent = 'Edit Product';
            document.getElementById('product-id').value = id;
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-price').value = product.default_price || '0';
            document.getElementById('product-tax-rate').value = product.default_tax_rate || '18';
            document.getElementById('product-stock').value = product.stock_quantity || '0';
            
            document.getElementById('productModal').classList.add('active');
        }
    } catch (error) {
        console.error('Edit product error:', error);
        showToast('Failed to load product details', 'error');
    }
}

/**
 * Delete product
 */
async function deleteProduct(id) {
    if (!confirmAction('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        const response = await api.deleteProduct(id);
        if (response.success) {
            showToast('Product deleted successfully', 'success');
            await loadProducts();
        }
    } catch (error) {
        console.error('Delete product error:', error);
        showToast(error.message || 'Failed to delete product', 'error');
    }
}

/**
 * Adjust stock (add or remove)
 */
async function adjustStock(productId, operation) {
    const action = operation === 'add' ? 'Add' : 'Remove';
    const quantity = prompt(`${action} Stock Quantity:`, '1');
    
    if (quantity === null || quantity.trim() === '') {
        return;
    }
    
    const qty = parseInt(quantity);
    
    if (isNaN(qty) || qty <= 0) {
        showToast('Please enter a valid positive number', 'error');
        return;
    }
    
    try {
        const response = await api.updateStock(productId, qty, operation);
        
        if (response.success) {
            showToast(`Stock ${operation === 'add' ? 'added' : 'removed'} successfully`, 'success');
            await loadProducts();
        }
    } catch (error) {
        console.error('Update stock error:', error);
        showToast(error.message || 'Failed to update stock', 'error');
    }
}