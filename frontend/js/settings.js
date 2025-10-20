/**
 * Settings Management
 */

/**
 * Load settings
 */
async function loadSettings() {
    try {
        const response = await api.getSettings();
        
        if (response.success && response.settings) {
            const settings = response.settings;
            
            // Populate form fields
            document.getElementById('setting-company-name').value = settings.company_name || '';
            document.getElementById('setting-gstin').value = settings.gstin || '';
            document.getElementById('setting-company-address').value = settings.company_address || '';
            document.getElementById('setting-seller-email').value = settings.seller_email || '';
            document.getElementById('setting-seller-phone').value = settings.seller_phone || '';
            document.getElementById('setting-invoice-footer').value = settings.invoice_footer || '';
        }
    } catch (error) {
        console.error('Load settings error:', error);
        showToast('Failed to load settings', 'error');
    }
}

/**
 * Save settings
 */
async function saveSettings() {
    const settings = {
        company_name: document.getElementById('setting-company-name').value.trim(),
        gstin: document.getElementById('setting-gstin').value.trim(),
        company_address: document.getElementById('setting-company-address').value.trim(),
        seller_email: document.getElementById('setting-seller-email').value.trim(),
        seller_phone: document.getElementById('setting-seller-phone').value.trim(),
        invoice_footer: document.getElementById('setting-invoice-footer').value.trim()
    };

    // Validate required fields
    if (!settings.company_name) {
        showToast('Company name is required', 'error');
        return;
    }

    try {
        const response = await api.bulkUpdateSettings(settings);
        
        if (response.success) {
            showToast('Settings saved successfully', 'success');
        }
    } catch (error) {
        console.error('Save settings error:', error);
        showToast(error.message || 'Failed to save settings', 'error');
    }
}