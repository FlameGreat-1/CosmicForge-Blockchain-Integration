'use strict';

// Import dependencies
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import configuration
const appConfig = require('./config/app');
const networkConfig = require('./config/network');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');

// Import routes
const patientRoutes = require('./routes/patientRoutes');
const auditRoutes = require('./routes/auditRoutes');
const accessRoutes = require('./routes/accessRoutes');

// Import services
const walletService = require('./services/walletService');
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Set up middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Set up CORS
app.use(cors(appConfig.cors));

// Set up rate limiting
const limiter = rateLimit(appConfig.rateLimit);
app.use(limiter);

// Set up request timeout
app.use((req, res, next) => {
    res.setTimeout(appConfig.timeout.request, () => {
        res.status(408).json({ error: 'Request timeout' });
    });
    next();
});

// Set up logging
if (appConfig.isDevelopment()) {
    app.use(morgan('dev'));
} else {
    // Create a write stream for access logs
    const accessLogStream = fs.createWriteStream(
        path.join(appConfig.logging.dir, 'access.log'),
        { flags: 'a' }
    );
    app.use(morgan('combined', { stream: accessLogStream }));
}

// Add request logging middleware
app.use(logger.logRequest);

// API routes
app.use(`${appConfig.apiPrefix}/patients`, patientRoutes);
app.use(`${appConfig.apiPrefix}/audit`, auditRoutes);
app.use(`${appConfig.apiPrefix}/access`, accessRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        environment: appConfig.env
    });
});

// API documentation endpoint
app.get(`${appConfig.apiPrefix}/docs`, (req, res) => {
    res.status(200).json({
        name: 'CosmicForge Blockchain API',
        version: '1.0.0',
        description: 'API for interacting with the CosmicForge blockchain network',
        endpoints: [
            { path: '/patients', description: 'Patient record operations' },
            { path: '/audit', description: 'Audit trail operations' },
            { path: '/access', description: 'Access control operations' }
        ]
    });
});

// 404 handler
app.use(errorHandler.notFound);

// Error handler
app.use(errorHandler.handleError);

// Initialize the application
const initializeApp = async () => {
    try {
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(appConfig.logging.dir)) {
            fs.mkdirSync(appConfig.logging.dir, { recursive: true });
        }
        
        // Create wallet directory if it doesn't exist
        if (!fs.existsSync(networkConfig.walletPath)) {
            fs.mkdirSync(networkConfig.walletPath, { recursive: true });
        }
        
        // Check if connection profile exists, if not generate it
        if (!fs.existsSync(networkConfig.connectionProfilePath)) {
            logger.info('Connection profile not found, generating...');
            const connectionProfile = networkConfig.generateConnectionProfile();
            networkConfig.saveConnectionProfile(connectionProfile);
            logger.info(`Connection profile generated at ${networkConfig.connectionProfilePath}`);
        }
        
        // Enroll admin if not already enrolled
        try {
            await walletService.enrollAdmin(appConfig.admin.id, appConfig.admin.password);
            logger.info('Admin enrolled successfully');
        } catch (error) {
            logger.warn(`Admin enrollment failed: ${error.message}`);
        }
        
        // Start the server
        app.listen(appConfig.port, appConfig.host, () => {
            logger.info(`Server running on ${appConfig.host}:${appConfig.port}`);
            logger.info(`Environment: ${appConfig.env}`);
            logger.info(`API prefix: ${appConfig.apiPrefix}`);
        });
    } catch (error) {
        logger.error(`Failed to initialize application: ${error.message}`);
        process.exit(1);
    }
};

// Start the application
initializeApp();

module.exports = app; 
