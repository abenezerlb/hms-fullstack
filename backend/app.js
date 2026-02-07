const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const paymentRoutes = require('./routes/paymentRoutes');

// Routes
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'Healthcare Management System API'
    });
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
    try {
        const { query } = require('./database/db');
        const result = await query('SELECT NOW() as current_time');
        res.json({ 
            success: true, 
            message: 'Database connected successfully',
            time: result.rows[0].current_time
        });
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed', details: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`HMS Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
});