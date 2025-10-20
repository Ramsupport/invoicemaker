const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get all invoices with filters
router.get('/', async (req, res) => {
    try {
        const { 
            status, 
            customer_name, 
            customer_phone,
            date_from, 
            date_to,
            limit = 100,
            offset = 0 
        } = req.query;

        let queryText = `
            SELECT i.*, c.name as customer_name, c.email, c.phone, c.address, c.gstin
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        // Filter by payment status
        if (status === 'paid') {
            queryText += ` AND i.payment_received = true`;
        } else if (status === 'unpaid') {
            queryText += ` AND i.payment_received = false`;
        }

        // Filter by customer name
        if (customer_name) {
            paramCount++;
            queryText += ` AND c.name ILIKE $${paramCount}`;
            params.push(`%${customer_name}%`);
        }

        // Filter by customer phone
        if (customer_phone) {
            paramCount++;
            queryText += ` AND c.phone ILIKE $${paramCount}`;
            params.push(`%${customer_phone}%`);
        }

        // Filter by date range
        if (date_from) {
            paramCount++;
            queryText += ` AND i.invoice_date >= $${paramCount}`;
            params.push(date_from);
        }

        if (date_to) {
            paramCount++;
            queryText += ` AND i.invoice_date <= $${paramCount}`;
            params.push(date_to);
        }

        queryText += ` ORDER BY i.id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        res.json({
            success: true,
            count: result.rows.length,
            invoices: result.rows
        });

    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get single invoice with items
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get invoice details
        const invoiceResult = await query(
            `SELECT i.*, c.name as customer_name, c.email, c.phone, c.address, c.gstin
             FROM invoices i
             LEFT JOIN customers c ON i.customer_id = c.id
             WHERE i.id = $1`,
            [id]
        );

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const invoice = invoiceResult.rows[0];

        // Get invoice items
        const itemsResult = await query(
            `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id`,
            [id]
        );

        invoice.items = itemsResult.rows;

        res.json({
            success: true,
            invoice
        });

    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Create new invoice
router.post('/',
    [
        body('customer_id').isInt(),
        body('invoice_date').isDate(),
        body('payment_terms').optional().trim(),
        body('items').isArray({ min: 1 })
    ],
    async (req, res) => {
        const client = await require('../config/database').pool.connect();
        
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { customer_id, invoice_date, payment_terms, items } = req.body;

            // Start transaction
            await client.query('BEGIN');

            // Calculate totals
            let subtotal = 0;
            let taxAmount = 0;

            items.forEach(item => {
                const itemSubtotal = item.quantity * item.price;
                subtotal += itemSubtotal;
                taxAmount += (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
            });

            const totalAmount = subtotal + taxAmount;

            // Insert invoice
            const invoiceResult = await client.query(
                `INSERT INTO invoices 
                (customer_id, invoice_date, payment_terms, subtotal, tax_amount, total_amount, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [customer_id, invoice_date, payment_terms || 'On Receipt', subtotal, taxAmount, totalAmount, req.user.id]
            );

            const invoice = invoiceResult.rows[0];

            // Insert invoice items and update stock
            for (const item of items) {
                // Insert item
                await client.query(
                    `INSERT INTO invoice_items 
                    (invoice_id, product_id, product_name, serial_number, warranty, quantity, price, cgst, sgst, igst, total)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        invoice.id,
                        item.product_id,
                        item.product_name,
                        item.serial_number,
                        item.warranty,
                        item.quantity,
                        item.price,
                        item.cgst || 0,
                        item.sgst || 0,
                        item.igst || 0,
                        item.total
                    ]
                );

                // Update product stock
                if (item.product_id) {
                    await client.query(
                        `UPDATE products 
                         SET stock_quantity = stock_quantity - $1,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $2 AND stock_quantity >= $1`,
                        [item.quantity, item.product_id]
                    );
                }
            }

            // Update next invoice number in settings
            await client.query(
                `UPDATE settings 
                 SET value = (CAST(value AS INTEGER) + 1)::TEXT 
                 WHERE key = 'next_invoice_number'`
            );

            // Commit transaction
            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Invoice created successfully',
                invoice
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Create invoice error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error creating invoice'
            });
        } finally {
            client.release();
        }
    }
);

// Update invoice
router.put('/:id',
    [
        body('customer_id').optional().isInt(),
        body('invoice_date').optional().isDate(),
        body('payment_terms').optional().trim(),
        body('items').optional().isArray()
    ],
    async (req, res) => {
        const client = await require('../config/database').pool.connect();
        
        try {
            const { id } = req.params;
            const { customer_id, invoice_date, payment_terms, items } = req.body;

            // Check if invoice is paid
            const checkResult = await client.query(
                'SELECT payment_received FROM invoices WHERE id = $1',
                [id]
            );

            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
                });
            }

            if (checkResult.rows[0].payment_received) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot edit paid invoice'
                });
            }

            await client.query('BEGIN');

            // Restore stock for old items
            const oldItems = await client.query(
                'SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $1',
                [id]
            );

            for (const item of oldItems.rows) {
                if (item.product_id) {
                    await client.query(
                        `UPDATE products 
                         SET stock_quantity = stock_quantity + $1 
                         WHERE id = $2`,
                        [item.quantity, item.product_id]
                    );
                }
            }

            // Delete old items
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

            // Calculate new totals
            let subtotal = 0;
            let taxAmount = 0;

            if (items && items.length > 0) {
                items.forEach(item => {
                    const itemSubtotal = item.quantity * item.price;
                    subtotal += itemSubtotal;
                    taxAmount += (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
                });
            }

            const totalAmount = subtotal + taxAmount;

            // Update invoice
            await client.query(
                `UPDATE invoices 
                 SET customer_id = COALESCE($1, customer_id),
                     invoice_date = COALESCE($2, invoice_date),
                     payment_terms = COALESCE($3, payment_terms),
                     subtotal = $4,
                     tax_amount = $5,
                     total_amount = $6,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $7`,
                [customer_id, invoice_date, payment_terms, subtotal, taxAmount, totalAmount, id]
            );

            // Insert new items and update stock
            if (items && items.length > 0) {
                for (const item of items) {
                    await client.query(
                        `INSERT INTO invoice_items 
                        (invoice_id, product_id, product_name, serial_number, warranty, quantity, price, cgst, sgst, igst, total)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                        [
                            id,
                            item.product_id,
                            item.product_name,
                            item.serial_number,
                            item.warranty,
                            item.quantity,
                            item.price,
                            item.cgst || 0,
                            item.sgst || 0,
                            item.igst || 0,
                            item.total
                        ]
                    );

                    // Update stock
                    if (item.product_id) {
                        await client.query(
                            `UPDATE products 
                             SET stock_quantity = stock_quantity - $1 
                             WHERE id = $2 AND stock_quantity >= $1`,
                            [item.quantity, item.product_id]
                        );
                    }
                }
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Invoice updated successfully'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Update invoice error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error updating invoice'
            });
        } finally {
            client.release();
        }
    }
);

// Record payment
router.post('/:id/payment',
    [
        body('payment_date').isDate(),
        body('payment_amount').isFloat({ min: 0 })
    ],
    async (req, res) => {
        try {
            const { id } = req.params;
            const { payment_date, payment_amount } = req.body;

            const result = await query(
                `UPDATE invoices 
                 SET payment_received = true,
                     payment_date = $1,
                     payment_amount = $2,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3 AND payment_received = false
                 RETURNING *`,
                [payment_date, payment_amount, id]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invoice not found or already paid'
                });
            }

            res.json({
                success: true,
                message: 'Payment recorded successfully',
                invoice: result.rows[0]
            });

        } catch (error) {
            console.error('Record payment error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
);

// Delete invoice
router.delete('/:id', async (req, res) => {
    const client = await require('../config/database').pool.connect();
    
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Restore stock
        const items = await client.query(
            'SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $1',
            [id]
        );

        for (const item of items.rows) {
            if (item.product_id) {
                await client.query(
                    `UPDATE products 
                     SET stock_quantity = stock_quantity + $1 
                     WHERE id = $2`,
                    [item.quantity, item.product_id]
                );
            }
        }

        // Delete invoice (cascade will delete items)
        const result = await client.query(
            'DELETE FROM invoices WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Invoice deleted successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    } finally {
        client.release();
    }
});

module.exports = router;