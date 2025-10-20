/**
 * PDF Generation using jsPDF
 */

/**
 * Generate PDF for invoice
 */
async function generateInvoicePDF(invoiceId) {
    try {
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

        // GSTIN
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
        doc.text(`Terms: ${invoice.payment_terms}`, pageWidth - 70, 88);

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
            yPos += 6;
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
        
        const colX = {
            no: margin,
            item: margin + 15,
            serial: margin + 70,
            warranty: margin + 110,
            qty: margin + 140,
            price: margin + 160,
            amount: pageWidth - margin - 30
        };

        doc.text('No.', colX.no, tableStartY + 7);
        doc.text('Item', colX.item, tableStartY + 7);
        doc.text('Serial', colX.serial, tableStartY + 7);
        doc.text('Warranty', colX.warranty, tableStartY + 7);
        doc.text('Qty', colX.qty, tableStartY + 7);
        doc.text('Price', colX.price, tableStartY + 7);
        doc.text('Amount', colX.amount, tableStartY + 7);

        // Table Items
        doc.setTextColor(...secondaryColor);
        doc.setFont(undefined, 'normal');
        
        let itemY = tableStartY + 15;
        const rowHeight = 10;

        invoice.items.forEach((item, index) => {
            // Alternate row background
            if (index % 2 === 0) {
                doc.setFillColor(247, 250, 252);
                doc.rect(0, itemY - 5, pageWidth, rowHeight, 'F');
            }

            doc.text((index + 1).toString(), colX.no, itemY);
            doc.text(item.product_name, colX.item, itemY);
            doc.text(item.serial_number || '-', colX.serial, itemY);
            doc.text(item.warranty || '-', colX.warranty, itemY);
            doc.text(item.quantity.toString(), colX.qty, itemY);
            doc.text(`₹${item.price.toFixed(2)}`, colX.price, itemY);
            doc.text(`₹${item.total.toFixed(2)}`, colX.amount, itemY);

            itemY += rowHeight;
        });

        // Totals Section
        itemY += 10;
        const totalsX = pageWidth - 80;

        doc.setFont(undefined, 'bold');
        doc.text('Subtotal:', totalsX, itemY);
        doc.setFont(undefined, 'normal');
        doc.text(`₹${invoice.subtotal.toFixed(2)}`, totalsX + 40, itemY);

        itemY += 8;
        doc.setFont(undefined, 'bold');
        doc.text('Tax:', totalsX, itemY);
        doc.setFont(undefined, 'normal');
        doc.text(`₹${invoice.tax_amount.toFixed(2)}`, totalsX + 40, itemY);

        itemY += 8;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.text('Total:', totalsX, itemY);
        doc.text(`₹${invoice.total_amount.toFixed(2)}`, totalsX + 40, itemY);

        // Amount in Words
        itemY += 15;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const amountInWords = numberToWords(invoice.total_amount);
        doc.text(`Amount in words: ${amountInWords}`, margin, itemY);

        // Banking Details
        itemY += 15;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('Banking Details:', margin, itemY);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        itemY += 7;
        doc.text('Account Name: Gizmohub', margin, itemY);
        itemY += 5;
        doc.text('Bank: HDFC Bank', margin, itemY);
        itemY += 5;
        doc.text('Account No: 50200058321387', margin, itemY);
        itemY += 5;
        doc.text('IFSC Code: HDFC0000967', margin, itemY);

        // Footer
        const footerY = pageHeight - 30;
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text('Terms & Conditions:', margin, footerY);
        doc.setFont(undefined, 'normal');
        doc.text('1. Payment due on receipt', margin, footerY + 5);
        doc.text('2. Goods once sold will not be taken back', margin, footerY + 10);
        
        if (settings.gstin) {
            doc.text(`GSTIN: ${settings.gstin}`, margin, footerY + 15);
        }

        // Invoice Footer Text
        if (settings.invoice_footer) {
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            const footerText = doc.splitTextToSize(settings.invoice_footer, pageWidth - 2 * margin);
            doc.text(footerText, pageWidth / 2, footerY + 20, { align: 'center' });
        }

        // Save PDF
        doc.save(`Invoice-${invoice.id}.pdf`);
        showToast('PDF generated successfully', 'success');

    } catch (error) {
        console.error('Generate PDF error:', error);
        showToast('Failed to generate PDF', 'error');
    }
}

/**
 * Convert number to words (Indian Rupees format)
 */
function numberToWords(amount) {
    const words = {
        0: 'Zero', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five',
        6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten',
        11: 'Eleven', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen',
        16: 'Sixteen', 17: 'Seventeen', 18: 'Eighteen', 19: 'Nineteen', 20: 'Twenty',
        30: 'Thirty', 40: 'Forty', 50: 'Fifty', 60: 'Sixty', 70: 'Seventy', 
        80: 'Eighty', 90: 'Ninety'
    };

    function convertBelowHundred(num) {
        if (num <= 20) return words[num];
        const tens = Math.floor(num / 10) * 10;
        const units = num % 10;
        return units === 0 ? words[tens] : `${words[tens]} ${words[units]}`;
    }

    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

    let result = '';

    // Convert crores
    if (rupees >= 10000000) {
        const crores = Math.floor(rupees / 10000000);
        result += convertBelowHundred(crores) + ' Crore ';
        const remaining = rupees % 10000000;
        if (remaining > 0) {
            return result + numberToWords(remaining + (paise / 100));
        }
    }

    // Convert lakhs
    if (rupees >= 100000) {
        const lakhs = Math.floor((rupees % 10000000) / 100000);
        result += convertBelowHundred(lakhs) + ' Lakh ';
    }

    // Convert thousands
    const thousands = Math.floor((rupees % 100000) / 1000);
    if (thousands > 0) {
        result += convertBelowHundred(thousands) + ' Thousand ';
    }

    // Convert hundreds
    const hundreds = Math.floor((rupees % 1000) / 100);
    if (hundreds > 0) {
        result += convertBelowHundred(hundreds) + ' Hundred ';
    }

    // Convert tens and units
    const tensAndUnits = rupees % 100;
    if (tensAndUnits > 0) {
        result += convertBelowHundred(tensAndUnits) + ' ';
    }

    result += 'Rupees';

    // Add paise
    if (paise > 0) {
        result += ' and ' + convertBelowHundred(paise) + ' Paise';
    }

    return result + ' Only';
}
```

---

## **STEP 17: Railway Deployment Configuration**

### **Create Required Files for Railway Deployment**

### **1. Procfile** (in root directory)
```
web: cd backend && npm start