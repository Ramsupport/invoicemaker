const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all customers
router.get('/', async (req, res) => {
    try {
        const { search, limit = 100, offset = 0 } = req.query;

        let queryText = 'SELECT * FROM customers WHERE 1=1';
        const params = [];

        if (search) {
            queryText += ` AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)`;
            params.push(`%${search}%`);
        }

        queryText += ` ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        res.json({
            success: true,
            count: result.rows.length,
            customers: result.rows
        });

    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get single customer
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT * FROM customers WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            customer: result.rows[0]
        });

    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Create customer
router.post('/',
    [
        body('name').notEmpty().trim(),
        body('email').optional().isEmail().normalizeEmail(),
        body('phone').optional().trim(),
        body('address').optional().trim(),
        body('gstin').optional().trim()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { name, email, phone, address, gstin } = req.body;

            const result = await query(
                `INSERT INTO customers (name, email, phone, address, gstin)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [name, email, phone, address, gstin]
            );

            res.status(201).json({
                success: true,
                message: 'Customer created successfully',
                customer: result.rows[0]
            });

        } catch (error) {
            console.error('Create customer error:', error);
            
            if (error.constraint === 'customers_name_key') {
                return res.status(400).json({
                    success: false,
                    message: 'Customer with this name already exists'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
);

// Update customer
router.put('/:id',
    [
        body('name').optional().notEmpty().trim(),
        body('email').optional().isEmail().normalizeEmail(),
        body('phone').optional().trim(),
        body('address').optional().trim(),
        body('gstin').optional().trim()
    ],
    async (req, res) => {
        try {
            const { id } = req.params;
            const { name, email, phone, address, gstin } = req.body;

            const result = await query(
                `UPDATE customers 
                 SET name = COALESCE($1, name),
                     email = COALESCE($2, email),
                     phone = COALESCE($3, phone),
                     address = COALESCE($4, address),
                     gstin = COALESCE($5, gstin),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $6
                 RETURNING *`,
                [name, email, phone, address, gstin, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }

            res.json({
                success: true,
                message: 'Customer updated successfully',
                customer: result.rows[0]
            });

        } catch (error) {
            console.error('Update customer error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
);

// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if customer has invoices
        const invoiceCheck = await query(
            'SELECT COUNT(*) FROM invoices WHERE customer_id = $1',
            [id]
        );

        if (parseInt(invoiceCheck.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete customer with existing invoices'
            });
        }

        const result = await query(
            'DELETE FROM customers WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            message: 'Customer deleted successfully'
        });

    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;