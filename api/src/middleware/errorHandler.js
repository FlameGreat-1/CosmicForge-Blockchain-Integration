'use strict';

const logger = require('../utils/logger');

/**
 * Error handling middleware for CosmicForge blockchain API
 */
const errorHandler = {
    /**
     * Log and handle errors
     * @param {Error} err - Error object
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    handleError: (err, req, res, next) => {
        // Log the error with context
        logger.logError(err, {
            url: req.originalUrl,
            method: req.method,
            userId: req.user ? req.user.id : 'anonymous',
            ip: req.ip
        });
        
        // Determine status code
        let statusCode = 500;
        
        if (err.name === 'ValidationError') {
            statusCode = 400;
        } else if (err.name === 'UnauthorizedError' || err.name === 'TokenExpiredError') {
            statusCode = 401;
        } else if (err.name === 'ForbiddenError') {
            statusCode = 403;
        } else if (err.name === 'NotFoundError') {
            statusCode = 404;
        }
        
        // Send error response
        res.status(statusCode).json({
            error: err.message || 'Internal Server Error',
            status: statusCode,
            success: false,
            // Include stack trace in development, but not in production
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        });
    },
    
    /**
     * Handle 404 errors for routes that don't exist
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    notFound: (req, res) => {
        logger.info({
            type: '404',
            url: req.originalUrl,
            method: req.method,
            ip: req.ip
        });
        
        res.status(404).json({
            error: 'Route not found',
            status: 404,
            success: false
        });
    },
    
    /**
     * Create custom error types
     */
    errors: {
        ValidationError: class ValidationError extends Error {
            constructor(message) {
                super(message);
                this.name = 'ValidationError';
            }
        },
        
        UnauthorizedError: class UnauthorizedError extends Error {
            constructor(message) {
                super(message || 'Unauthorized');
                this.name = 'UnauthorizedError';
            }
        },
        
        ForbiddenError: class ForbiddenError extends Error {
            constructor(message) {
                super(message || 'Forbidden');
                this.name = 'ForbiddenError';
            }
        },
        
        NotFoundError: class NotFoundError extends Error {
            constructor(message) {
                super(message || 'Resource not found');
                this.name = 'NotFoundError';
            }
        },
        
        BlockchainError: class BlockchainError extends Error {
            constructor(message, txId) {
                super(message || 'Blockchain transaction failed');
                this.name = 'BlockchainError';
                this.txId = txId;
            }
        }
    }
};

module.exports = errorHandler;
