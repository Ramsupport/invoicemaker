/**
 * PDF Generation using jsPDF
 * FIXED VERSION - Removed syntax errors
 */

/**
 * Generate PDF for invoice
 */
async function generateInvoicePDF(invoiceId) {
    try {
        showToast('Generating PDF...', 'info');
        
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF library not loaded');
        }

        // Load invoice data
        const invoiceResponse = await api.getInvoice(invoiceId);
        if (!invoiceResponse.success) {
            throw new Error('Failed to load invoice');
        }

        const invoice = invoiceResponse.invoice;
        
        // Load company settings
        const settingsResponse = await api.getSettings();
        const settings = settingsResponse.settings || {};

        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Page dimensions
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;

        // Colors
        const primaryColor = [102, 126, 234];
        const secondaryColor = [45, 55, 72];

        // Header - Blue bar
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 15, 'F');

        // Company Information
        doc.setFillColor(230, 240, 255);
        doc.rect(0, 15, pageWidth, 40, 'F');

        doc.setFontSize(16);
        doc.setTextColor(...secondaryColor);
        doc.setFont(undefined, 'bold');
        doc.text(settings.company_name || 'Company Name', margin, 30);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(settings.company_address || '', margin, 38);
        doc.text(`Email: ${settings.seller_email || ''}`, margin, 44);
        doc.text(`Phone: ${settings.seller_phone || ''}`, margin, 50);

        if (settings.gstin) {
            doc.text(`GSTIN: ${settings.gstin}`, margin, 56);
        }

        // Invoice Number Box
        doc.setFillColor(230, 240, 255);
        doc.roundedRect(pageWidth - 70, 60, 50, 20, 3, 3, 'F');
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(`INVOICE #${invoice.id}`, pageWidth - 65, 70);

        // Invoice Details
        doc.setFontSize(10);
        doc.setTextColor(...secondaryColor);
        doc.setFont(undefined, 'normal');
        doc.text(`Date: ${formatDate(invoice.invoice_date)}`, pageWidth - 70, 82);
        doc.text(`Terms: ${invoice.payment_terms || 'On Receipt'}`, pageWidth - 70, 88);

        // Payment Status
        const yStatusPos = 94;
        if (invoice.payment_received) {
            doc.setTextColor(72, 187, 120);
            doc.setFont(undefined, 'bold');
            doc.text('Status: PAID', pageWidth - 70, yStatusPos);
        } else {
            doc.setTextColor(245, 101, 101);
            doc.setFont(undefined, 'bold');
            doc.text('Status: UNPAID', pageWidth - 70, yStatusPos);
        }

        doc.setTextColor(...secondaryColor);
        doc.setFont(undefined, 'normal');

        // Bill To Section
        let yPos = 70;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('Bill To:', margin, yPos);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        yPos += 8;
        doc.text(invoice.customer_name || 'N/A', margin, yPos);
        
        if (invoice.address) {
            yPos += 6;
            const addressLines = doc.splitTextToSize(invoice.address, 80);
            doc.text(addressLines, margin, yPos);
            yPos += addressLines.length * 6;
        }

        yPos += 6;
        if (invoice.phone) {
            doc.text(`Phone: ${invoice.phone}`, margin, yPos);
            yPos += 6;
        }

        if (invoice.email) {
            doc.text(`Email: ${invoice.email}`, margin, yPos);
            yPos += 6;
        }

        if (invoice.gstin) {
            doc.text(`GSTIN: ${invoice.gstin}`, margin, yPos);
        }

        // Items Table
        yPos = Math.max(yPos, 105);
        const tableStartY = yPos + 10;

        // Table Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, tableStartY, pageWidth, 10, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        
        doc.text('No.', margin, tableStartY + 7);
        doc.text('Item', margin + 15, tableStartY + 7);
        doc.text('Qty', pageWidth - 80, tableStartY + 7);
        doc.text('Price', pageWidth - 60, tableStartY + 7);
        doc.text('Amount', pageWidth - 35, tableStartY + 7);

        // Table Items
        doc.setTextColor(...secondaryColor);
        doc.setFont(undefined, 'normal');
        
        let itemY = tableStartY + 15;
        const rowHeight = 10;

        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach((item, index) => {
                // Alternate row background
                if (index % 2 === 0) {
                    doc.setFillColor(247, 250, 252);
                    doc.rect(0, itemY - 5, pageWidth, rowHeight, 'F');
                }

                doc.text((index + 1).toString(), margin, itemY);
                doc.text(item.product_name || 'Item', margin + 15, itemY);
                doc.text(item.quantity.toString(), pageWidth - 80, itemY);
                doc.text(`₹${parseFloat(item.price).toFixed(2)}`, pageWidth - 60, itemY);
                doc.text(`₹${parseFloat(item.total).toFixed(2)}`, pageWidth - 35, itemY);

                itemY += rowHeight;
            });
        }

        // Totals Section
        itemY += 10;
        const totalsX = pageWidth - 80;

        doc.setFont(undefined, 'bold');
        doc.text('Subtotal:', totalsX, itemY);
        doc.setFont(undefined, 'normal');
        doc.text(`₹${parseFloat(invoice.subtotal || 0).toFixed(2)}`, totalsX + 40, itemY);

        itemY += 8;
        doc.setFont(undefined, 'bold');
        doc.text('Tax:', totalsX, itemY);
        doc.setFont(undefined, 'normal');
        doc.text(`₹${parseFloat(invoice.tax_amount || 0).toFixed(2)}`, totalsX + 40, itemY);

        itemY += 8;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.text('Total:', totalsX, itemY);
        doc.text(`₹${parseFloat(invoice.total_amount || 0).toFixed(2)}`, totalsX + 40, itemY);

        // Footer
        const footerY = pageHeight - 30;
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text('Thank you for your business!', margin, footerY);
        
        if (settings.invoice_footer) {
            doc.setFont(undefined, 'normal');
            doc.text(settings.invoice_footer, margin, footerY + 5);
        }

        // Save PDF
        doc.save(`Invoice-${invoice.id}.pdf`);
        showToast('PDF generated successfully', 'success');

    } catch (error) {
        console.error('Generate PDF error:', error);
        showToast('Failed to generate PDF: ' + error.message, 'error');
    }
}