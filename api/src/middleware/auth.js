'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const walletService = require('../services/walletService');

/**
 * Authentication middleware for CosmicForge blockchain API
 */
const authMiddleware = {
    /**
     * Verify JWT token and set user in request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    verifyToken: async (req, res, next) => {
        try {
            // Get token from Authorization header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'No token provided' });
            }
            
            const token = authHeader.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cosmicforge-secret');
            
            // Check if user identity exists in wallet
            try {
                const identity = await walletService.getUserIdentity(decoded.id);
                if (!identity.exists) {
                    return res.status(401).json({ error: 'User identity not found in blockchain wallet' });
                }
            } catch (error) {
                logger.error(`Failed to verify user identity: ${error.message}`);
                return res.status(401).json({ error: 'Failed to verify user identity' });
            }
            
            // Set user in request
            req.user = decoded;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Invalid token' });
            } else {
                logger.error(`Authentication error: ${error.message}`);
                return res.status(500).json({ error: 'Authentication failed' });
            }
        }
    },
    
    /**
     * Check if user has required role
     * @param {Array} roles - Array of allowed roles
     * @returns {Function} - Express middleware
     */
    hasRole: (roles) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            
            next();
        };
    },
    
    /**
     * Optional authentication - set user if token is valid, but don't require it
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    optionalAuth: async (req, res, next) => {
        try {
            // Get token from Authorization header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                // No token, but that's okay for optional auth
                return next();
            }
            
            const token = authHeader.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cosmicforge-secret');
            
            // Set user in request
            req.user = decoded;
            next();
        } catch (error) {
            // Token is invalid, but we don't require it for optional auth
            next();
        }
    }
};

module.exports = authMiddleware;
