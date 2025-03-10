'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

class HashingService {
    constructor() {
        this.defaultAlgorithm = process.env.HASH_ALGORITHM || 'sha256';
    }

    /**
     * Generate a hash of the provided data
     * @param {Object|String} data - Data to hash
     * @param {String} algorithm - Hashing algorithm to use (defaults to sha256)
     * @returns {String} - Hexadecimal hash string
     */
    generateHash(data, algorithm = this.defaultAlgorithm) {
        try {
            const stringData = typeof data === 'object' ? JSON.stringify(data) : String(data);
            const hash = crypto.createHash(algorithm).update(stringData).digest('hex');
            return hash;
        } catch (error) {
            logger.error(`Failed to generate hash: ${error.message}`);
            throw new Error(`Failed to generate hash: ${error.message}`);
        }
    }

    /**
     * Verify if a hash matches the provided data
     * @param {Object|String} data - Data to verify
     * @param {String} hash - Hash to compare against
     * @param {String} algorithm - Hashing algorithm to use (defaults to sha256)
     * @returns {Boolean} - Whether the hash matches the data
     */
    verifyHash(data, hash, algorithm = this.defaultAlgorithm) {
        try {
            const generatedHash = this.generateHash(data, algorithm);
            return generatedHash === hash;
        } catch (error) {
            logger.error(`Failed to verify hash: ${error.message}`);
            throw new Error(`Failed to verify hash: ${error.message}`);
        }
    }

    /**
     * Generate a deterministic ID from data
     * @param {Object|String} data - Data to generate ID from
     * @returns {String} - ID derived from the data
     */
    generateId(data) {
        try {
            const hash = this.generateHash(data);
            return hash.substring(0, 16); // Return first 16 characters of hash as ID
        } catch (error) {
            logger.error(`Failed to generate ID: ${error.message}`);
            throw new Error(`Failed to generate ID: ${error.message}`);
        }
    }

    /**
     * Generate a hash with timestamp for versioning
     * @param {Object|String} data - Data to hash
     * @returns {Object} - Object containing hash and timestamp
     */
    generateVersionedHash(data) {
        try {
            const timestamp = new Date().toISOString();
            const dataWithTimestamp = {
                data: data,
                timestamp: timestamp
            };

            const hash = this.generateHash(dataWithTimestamp);

            return {
                hash,
                timestamp,
                algorithm: this.defaultAlgorithm
            };
        } catch (error) {
            logger.error(`Failed to generate versioned hash: ${error.message}`);
            throw new Error(`Failed to generate versioned hash: ${error.message}`);
        }
    }
    
    // Insert at cursor
}

module.exports = new HashingService();
