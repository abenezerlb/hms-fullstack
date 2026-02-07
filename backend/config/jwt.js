/**
 * JWT Configuration
 */
require('dotenv').config();

const jwtConfig = {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    options: {
        expiresIn: process.env.JWT_EXPIRY || '24h',
        issuer: process.env.JWT_ISSUER || 'hms-api',
        audience: process.env.JWT_AUDIENCE || 'hms-users'
    },
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
};

// Validate JWT secret
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('❌ JWT_SECRET is not set in production environment!');
    process.exit(1);
}

module.exports = jwtConfig;