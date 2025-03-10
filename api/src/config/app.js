'use strict';

/**
 * Application configuration for CosmicForge blockchain API
 */
const appConfig = {
    // Server configuration
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    
    // Environment
    env: process.env.NODE_ENV || 'development',
    
    // API configuration
    apiPrefix: process.env.API_PREFIX || '/api',
    
    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    
    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false
    },
    
    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'cosmicforge-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    
    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        dir: process.env.LOG_DIR || 'logs'
    },
    
    // Blockchain admin configuration
    admin: {
        id: process.env.ADMIN_ID || 'admin',
        password: process.env.ADMIN_PASSWORD || 'adminpw'
    },
    
    // Timeout configuration
    timeout: {
        request: parseInt(process.env.REQUEST_TIMEOUT) || 30000 // 30 seconds
    },
    
    // Determine if we're in production
    isProduction: () => {
        return appConfig.env === 'production';
    },
    
    // Determine if we're in development
    isDevelopment: () => {
        return appConfig.env === 'development';
    },
    
    // Determine if we're in test
    isTest: () => {
        return appConfig.env === 'test';
    }
};

module.exports = appConfig;
