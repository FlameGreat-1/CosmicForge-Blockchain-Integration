'use strict';

const logger = require('./logger');

/**
 * Validators for CosmicForge blockchain integration
 */
const validators = {
    /**
     * Validate patient ID
     * @param {String} patientId - Patient ID to validate
     * @returns {Boolean} - Whether the patient ID is valid
     */
    isValidPatientId: (patientId) => {
        if (!patientId || typeof patientId !== 'string') {
            return false;
        }
        // Patient ID should be alphanumeric and at least 5 characters
        return /^[a-zA-Z0-9_-]{5,64}$/.test(patientId);
    },

    /**
     * Validate hash string
     * @param {String} hash - Hash to validate
     * @returns {Boolean} - Whether the hash is valid
     */
    isValidHash: (hash) => {
        if (!hash || typeof hash !== 'string') {
            return false;
        }
        // Hash should be a hexadecimal string of appropriate length (SHA-256 = 64 chars)
        return /^[a-fA-F0-9]{64}$/.test(hash);
    },

    /**
     * Validate permissions array or string
     * @param {Array|String} permissions - Permissions to validate
     * @returns {Boolean} - Whether the permissions are valid
     */
    isValidPermissions: (permissions) => {
        const validPermissions = ['READ', 'UPDATE', 'DELETE', 'GRANT'];

        if (Array.isArray(permissions)) {
            // Check if all permissions are valid
            return permissions.every(p => validPermissions.includes(p.toUpperCase()));
        } else if (typeof permissions === 'string') {
            // Check if comma-separated permissions are valid
            const permissionArray = permissions.split(',').map(p => p.trim().toUpperCase());
            return permissionArray.every(p => validPermissions.includes(p));
        }

        return false;
    },

    /**
     * Validate ISO date string
     * @param {String} dateStr - Date string to validate
     * @returns {Boolean} - Whether the date string is valid
     */
    isValidDateString: (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') {
            return false;
        }
        // Check if it's a valid ISO date string
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) && dateStr === date.toISOString();
    },

    /**
     * Validate user ID
     * @param {String} userId - User ID to validate
     * @returns {Boolean} - Whether the user ID is valid
     */
    isValidUserId: (userId) => {
        if (!userId || typeof userId !== 'string') {
            return false;
        }
        // User ID should be alphanumeric and at least 3 characters
        return /^[a-zA-Z0-9_-]{3,64}$/.test(userId);
    },

    /**
     * Validate transaction ID
     * @param {String} txId - Transaction ID to validate
     * @returns {Boolean} - Whether the transaction ID is valid
     */
    isValidTransactionId: (txId) => {
        if (!txId || typeof txId !== 'string') {
            return false;
        }
        // Transaction ID should be a hexadecimal string of appropriate length
        return /^[a-fA-F0-9]{64}$/.test(txId);
    },

    /**
     * Validate metadata object
     * @param {Object|String} metadata - Metadata to validate
     * @returns {Boolean} - Whether the metadata is valid
     */
    isValidMetadata: (metadata) => {
        if (!metadata) {
            return false;
        }

        try {
            // If it's a string, try to parse it as JSON
            const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;

            // Check if it's an object
            return typeof metadataObj === 'object' && !Array.isArray(metadataObj);
        } catch (error) {
            logger.error(`Invalid metadata format: ${error.message}`);
            return false;
        }
    },

    /**
     * Validate request body for patient registration
     * @param {Object} body - Request body
     * @returns {Object} - Validation result
     */
    validatePatientRegistration: (body) => {
        const errors = [];

        if (!validators.isValidPatientId(body.patientId)) {
            errors.push('Invalid patient ID');
        }

        if (!body.patientData) {
            errors.push('Patient data is required');
        }

        if (body.userId && !validators.isValidUserId(body.userId)) {
            errors.push('Invalid user ID');
        }

        return { isValid: errors.length === 0, errors };
    },

    /**
     * Validate request body for patient update
     * @param {Object} body - Request body
     * @returns {Object} - Validation result
     */
    validatePatientUpdate: (body) => {
        const errors = [];

        if (!validators.isValidPatientId(body.patientId)) {
            errors.push('Invalid patient ID');
        }

        if (!body.patientData) {
            errors.push('Patient data is required');
        }

        if (body.previousHash && !validators.isValidHash(body.previousHash)) {
            errors.push('Invalid previous hash');
        }

        if (body.userId && !validators.isValidUserId(body.userId)) {
            errors.push('Invalid user ID');
        }

        return { isValid: errors.length === 0, errors };
    },

    /**
     * Validate request body for access grant
     * @param {Object} body - Request body
     * @returns {Object} - Validation result
     */
    validateAccessGrant: (body) => {
        const errors = [];

        if (!validators.isValidPatientId(body.patientId)) {
            errors.push('Invalid patient ID');
        }

        if (!validators.isValidUserId(body.granteeId)) {
            errors.push('Invalid grantee ID');
        }

        if (!validators.isValidPermissions(body.permissions)) {
            errors.push('Invalid permissions');
        }

        if (body.expiryDate && !validators.isValidDateString(body.expiryDate)) {
            errors.push('Invalid expiry date');
        }

        if (body.userId && !validators.isValidUserId(body.userId)) {
            errors.push('Invalid user ID');
        }

        return { isValid: errors.length === 0, errors };
    }
};

module.exports = validators;
