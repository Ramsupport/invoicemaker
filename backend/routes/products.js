const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all products
router.get('/', async (req, res) => {
    try {
        const { search, stock_status, limit = 100, offset = 0 } = req.query;

        let queryText = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            queryText += ` AND name ILIKE $${paramCount}`;
            params.push(`%${search}%`);
        }

        if (stock_status === 'in_stock') {
            queryText += ` AND stock_quantity > 0`;
        } else if (stock_status === 'low_stock') {
            queryText += ` AND stock_quantity > 0 AND stock_quantity < 5`;
        } else if (stock_status === 'out_of_stock') {
            queryText += ` AND stock_quantity = 0`;
        }

        queryText += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        res.json({
            success: true,
            count: result.rows.length,
            products: result.rows
        });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product: result.rows[0]
        });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Create product
router.post('/',
    [
        body('name').notEmpty().trim(),
        body('default_price').isFloat({ min: 0 }),
        body('default_tax_rate').optional().isFloat({ min: 0, max: 100 }),
        body('stock_quantity').optional().isInt({ min: 0 })
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

            const { name, default_price, default_tax_rate, stock_quantity } = req.body;

            const result = await query(
                `INSERT INTO products (name, default_price, default_tax_rate, stock_quantity)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [name, default_price, default_tax_rate || 18.00, stock_quantity || 0]
            );

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                product: result.rows[0]
            });

        } catch (error) {
            console.error('Create product error:', error);
            
            if (error.constraint === 'products_name_key') {
                return res.status(400).json({
                    success: false,
                    message: 'Product with this name already exists'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
);

// Update product
router.put('/:id',
    [
        body('name').optional().notEmpty().trim(),
        body('default_price').optional().isFloat({ min: 0 }),
        body('default_tax_rate').optional().isFloat({ min: 0, max: 100 }),
        body('stock_quantity').optional().isInt({ min: 0 })
    ],
    async (req, res) => {
        try {
            const { id } = req.params;
            const { name, default_price, default_tax_rate, stock_quantity } = req.body;

            const result = await query(
                `UPDATE products 
                 SET name = COALESCE($1, name),
                     default_price = COALESCE($2, default_price),
                     default_tax_rate = COALESCE($3, default_tax_rate),
                     stock_quantity = COALESCE($4, stock_quantity),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $5
                 RETURNING *`,
                [name, default_price, default_tax_rate, stock_quantity, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.json({
                success: true,
                message: 'Product updated successfully',
                product: result.rows[0]
            });

        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
);

// Update stock
router.patch('/:id/stock',
    [
        body('quantity').isInt(),
        body('operation').isIn(['add', 'remove', 'set'])
    ],
    async (req, res) => {
        try {
            const { id } = req.params;
            const { quantity, operation } = req.body;

            let queryText;
            let params;

            if (operation === 'add') {
                queryText = `UPDATE products 
                            SET stock_quantity = stock_quantity + $1,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $2 
                            RETURNING *`;
                params = [quantity, id];
            } else if (operation === 'remove') {
                queryText = `UPDATE products 
                            SET stock_quantity = GREATEST(stock_quantity - $1, 0),
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $2 
                            RETURNING *`;
                params = [quantity, id];
            } else { // set
                queryText = `UPDATE products 
                            SET stock_quantity = $1,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $2 
                            RETURNING *`;
                params = [quantity, id];
            }

            const result = await query(queryText, params);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.json({
                success: true,
                message: 'Stock updated successfully',
                product: result.rows[0]
            });

        } catch (error) {
            console.error('Update stock error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
);

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM products WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;