const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * Request Logging Middleware
 */

// Custom Morgan token for user ID
morgan.token('user', (req) => {
    return req.user ? req.user.id : 'anonymous';
});

// Custom Morgan token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
    return `${(res.getHeader('X-Response-Time') || 0).toFixed(2)}ms`;
});

// Skip health check and ping endpoints in production
const skipLogging = (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return req.path === '/api/health' || req.path === '/api/ping';
    }
    return false;
};

// Development format
const devFormat = ':method :url :status :response-time-ms - :user';

// Production format (less verbose)
const prodFormat = ':remote-addr :user ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

// Choose format based on environment
const format = process.env.NODE_ENV === 'production' ? prodFormat : devFormat;

/**
 * HTTP request logger middleware
 */
const httpLogger = morgan(format, {
    stream: {
        write: (message) => logger.http(message.trim())
    },
    skip: skipLogging
});

/**
 * Response time middleware
 * Adds X-Response-Time header
 */
const responseTime = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        res.setHeader('X-Response-Time', duration);
        
        // Log slow requests
        if (duration > 1000) { // > 1 second
            logger.warn(`Slow request detected: ${req.method} ${req.originalUrl} took ${duration}ms`);
        }
    });
    next();
};

/**
 * Request ID middleware
 * Adds unique ID to each request for tracing
 */
const requestId = (req, res, next) => {
    req.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    res.setHeader('X-Request-ID', req.id);
    next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // CSP header (basic)
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    );
    
    // HSTS header (in production)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
};

/**
 * CORS middleware
 */
const cors = (req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',') 
        : ['http://localhost:3000', 'http://localhost:5173'];
    
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
};

/**
 * Rate limiting middleware (simple version)
 */
const rateLimiter = (limit = 100, windowMs = 15 * 60 * 1000) => { // 100 requests per 15 minutes default
    const requests = new Map();
    
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        if (!requests.has(ip)) {
            requests.set(ip, { count: 1, startTime: now });
        } else {
            const userRequests = requests.get(ip);
            
            // Reset if window has passed
            if (now - userRequests.startTime > windowMs) {
                userRequests.count = 1;
                userRequests.startTime = now;
            } else if (userRequests.count >= limit) {
                logger.warn(`Rate limit exceeded for IP: ${ip}`);
                return res.status(429).json({
                    success: false,
                    error: "Too Many Requests",
                    message: `Rate limit exceeded. Please try again in ${Math.ceil((windowMs - (now - userRequests.startTime)) / 1000)} seconds.`
                });
            } else {
                userRequests.count++;
            }
        }
        
        // Cleanup old entries (simple garbage collection)
        if (requests.size > 1000) {
            for (const [key, value] of requests.entries()) {
                if (now - value.startTime > windowMs) {
                    requests.delete(key);
                }
            }
        }
        
        next();
    };
};

module.exports = {
    httpLogger,
    responseTime,
    requestId,
    securityHeaders,
    cors,
    rateLimiter
};