const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import database connection
const dbManager = require('./database/connection');

// Import routes
const routes = require('./routes');

// Import middleware
const { cors, securityHeaders, requestId, responseTime, httpLogger, rateLimiter } = require('./middleware/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Global middleware (applied to all routes)
app.use(cors);
app.use(securityHeaders);
app.use(requestId);
app.use(responseTime);
app.use(httpLogger);
app.use(rateLimiter(100)); // 100 requests per 15 minutes

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (if needed)
app.use('/public', express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/', routes);

// 404 handler
app.use('*', notFound);

// Global error handler
app.use(errorHandler);

// Database connection and server startup
async function startServer() {
    try {
        // Initialize database connection
        await dbManager.initialize();
        console.log('✅ Database connected successfully');
        
        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
            console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
            console.log(`🔐 Login Endpoint: http://localhost:${PORT}/api/auth/login`);
            console.log(`\n📋 Available Roles:`);
            console.log(`   - Admin: admin@hms.et / temporary_password`);
            console.log(`   - Doctor: alex@hms.et / temporary_password`);
            console.log(`   - Receptionist: reception@hms.et / temporary_password`);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received. Shutting down gracefully...');
            await dbManager.shutdown();
            process.exit(0);
        });
        
        process.on('SIGINT', async () => {
            console.log('SIGINT received. Shutting down gracefully...');
            await dbManager.shutdown();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app; // For testing