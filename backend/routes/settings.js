const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

router.use(authMiddleware);

// Get all settings
router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT * FROM settings ORDER BY key');

        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get single setting
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;

        const result = await query(
            'SELECT value FROM settings WHERE key = $1',
            [key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        res.json({
            success: true,
            key,
            value: result.rows[0].value
        });

    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update setting (admin only)
router.put('/:key',
    requireAdmin,
    [
        body('value').notEmpty()
    ],
    async (req, res) => {
        try {
            const { key } = req.params;
            const { value } = req.body;

            const result = await query(
                `INSERT INTO settings (key, value, updated_at)
                 VALUES ($1, $2, CURRENT_TIMESTAMP)
                 ON CONFLICT (key) 
                 DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [key, value]
            );

            res.json({
                success: true,
                message: 'Setting updated successfully',
                setting: result.rows[0]
            });

        } catch (error) {
            console.error('Update setting error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
);

// Bulk update settings
router.post('/bulk',
    requireAdmin,
    [
        body('settings').isObject()
    ],
    async (req, res) => {
        const client = await require('../config/database').pool.connect();
        
        try {
            const { settings } = req.body;

            await client.query('BEGIN');

            for (const [key, value] of Object.entries(settings)) {
                await client.query(
                    `INSERT INTO settings (key, value, updated_at)
                     VALUES ($1, $2, CURRENT_TIMESTAMP)
                     ON CONFLICT (key) 
                     DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
                    [key, value]
                );
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Settings updated successfully'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Bulk update settings error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        } finally {
            client.release();
        }
    }
);

module.exports = router;