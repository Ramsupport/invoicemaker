const { Pool } = require('pg');
require('dotenv').config();

// Validate required environment variables
if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set in .env file');
    console.error('Please set DATABASE_URL in your .env file');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET is not set in .env file');
    console.error('Please set JWT_SECRET in your .env file');
    process.exit(1);
}

console.log('Connecting to database...');

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20
});

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on database client', err);
    process.exit(-1);
});

// Query helper function
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
            console.log('Executed query', { duration: `${duration}ms`, rows: res.rowCount });
        }
        return res;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
};

// Initialize database tables
const initializeDatabase = async () => {
    try {
        console.log('Initializing database...');
        
        // Test connection first
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        console.log('   Server time:', testResult.rows[0].now);

        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '../models/schema.sql');
        
        // Check if schema file exists
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at: ${schemaPath}`);
        }

        console.log('Reading schema file...');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute schema
        console.log('Creating/updating database tables...');
        await pool.query(schema);
        
        console.log('✅ Database tables initialized successfully');
        
        // Verify tables were created
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('📋 Database tables:', tableCheck.rows.map(r => r.table_name).join(', '));
        
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        console.error('Full error:', error);
        throw error;
    }
};

module.exports = {
    pool,
    query,
    initializeDatabase
};