'use strict';

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'cosmicforge-blockchain' },
    transports: [
        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 10
        }),
        // Write all logs with level 'info' and below to combined.log
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10
        })
    ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple())
        })
    );
}

// Add request logging helper
logger.logRequest = (req, res, next) => {
    const start = Date.now();

    // Once the request is finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            type: 'request',
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration,
            ip: req.ip,
            userId: req.user ? req.user.id : 'anonymous'
        });
    });

    next();
};

// Add blockchain transaction logging helper
logger.logBlockchainTx = (txType, txId, userId, details) => {
    logger.info({
        type: 'blockchain_tx',
        txType,
        txId,
        userId,
        details,
        timestamp: new Date().toISOString()
    });
};

// Add error logging helper with redaction of sensitive data
logger.logError = (error, context = {}) => {
    // Redact any sensitive information
    const safeContext = { ...context };

    // List of fields to redact
    const sensitiveFields = ['password', 'secret', 'token', 'privateKey', 'key'];

    // Redact sensitive fields
    for (const field of sensitiveFields) {
        if (safeContext[field]) {
            safeContext[field] = '[REDACTED]';
        }
    }

    logger.error({
        message: error.message,
        stack: error.stack,
        context: safeContext,
        timestamp: new Date().toISOString()
    });
};

module.exports = logger;
