/**
 * Centralized logging utility for HMS
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

// Custom format for file output (JSON for easier parsing)
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
);

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format: winston.format.json(),
    defaultMeta: { service: 'hms-backend' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: consoleFormat,
        }),
        
        // Error logs file
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        
        // All logs file
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
    
    // Handle exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/exceptions.log'),
        }),
    ],
    
    // Handle promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/rejections.log'),
        }),
    ],
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Stream for Morgan (HTTP logging)
logger.stream = {
    write: (message) => logger.http(message.trim()),
};

module.exports = logger;