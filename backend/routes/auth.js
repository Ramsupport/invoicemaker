const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Register new user
router.post('/register',
    [
        body('username').isLength({ min: 3 }).trim(),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 })
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

            const { username, email, password } = req.body;

            // Check if user exists
            const existingUser = await query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Username or email already exists'
                });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Insert user
            const result = await query(
                `INSERT INTO users (username, email, password_hash, role) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id, username, email, role`,
                [username, email, passwordHash, 'user']
            );

            const user = result.rows[0];

            // Generate JWT token
				const token = jwt.sign(
					{ 
						id: user.id, 
						username: user.username,
						email: user.email,
						role: user.role 
					},
					process.env.JWT_SECRET,
					{ expiresIn: '7d' } // <-- FIX: Set a valid timespan
				);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during registration'
            });
        }
    }
);

// Login
router.post('/login',
    [
        body('username').notEmpty().trim(),
        body('password').notEmpty()
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

            const { username, password } = req.body;

            // Get user from database
            const result = await query(
                'SELECT * FROM users WHERE username = $1',
                [username]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }

            const user = result.rows[0];

            // Verify password
            const isValidPassword = await bcrypt.compare(
                password, 
                user.password_hash
            );

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }

            // Update last login
            await query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

           // Generate JWT token
			const token = jwt.sign(
				{ 
					id: user.id, 
					username: user.username,
					email: user.email,
					role: user.role 
				},
				process.env.JWT_SECRET,
				{ expiresIn: '7d' } // <-- FIX: Set a valid timespan
			);

            // Set cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during login'
            });
        }
    }
);

// Logout
router.post('/logout', authMiddleware, (req, res) => {
    res.clearCookie('token');
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Change password
router.put('/change-password', 
    authMiddleware,
    [
        body('currentPassword').notEmpty(),
        body('newPassword').isLength({ min: 6 })
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

            const { currentPassword, newPassword } = req.body;

            // Get user
            const result = await query(
                'SELECT password_hash FROM users WHERE id = $1',
                [req.user.id]
            );

            const user = result.rows[0];

            // Verify current password
            const isValid = await bcrypt.compare(
                currentPassword, 
                user.password_hash
            );

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);

            // Update password
            await query(
                'UPDATE users SET password_hash = $1 WHERE id = $2',
                [newPasswordHash, req.user.id]
            );

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    }
);

module.exports = router;