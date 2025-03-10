'use strict';

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const auth = require('../middleware/auth');
const validators = require('../utils/validators');
const errorHandler = require('../middleware/errorHandler');

/**
 * @route POST /api/audit/create
 * @desc Create a new audit entry on the blockchain
 * @access Private
 */
router.post('/create', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.body.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        if (!req.body.action) {
            throw new errorHandler.errors.ValidationError('Action is required');
        }
        
        await auditController.createAuditEntry(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/audit/:patientId
 * @desc Get the audit trail for a patient
 * @access Private
 */
router.get('/:patientId', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.params.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        await auditController.getAuditTrail(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/audit/:patientId/date-range
 * @desc Get the audit trail for a patient within a date range
 * @access Private
 */
router.get('/:patientId/date-range', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.params.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        if (!req.query.startDate || !req.query.endDate) {
            throw new errorHandler.errors.ValidationError('Start date and end date are required');
        }
        
        if (!validators.isValidDateString(req.query.startDate) || !validators.isValidDateString(req.query.endDate)) {
            throw new errorHandler.errors.ValidationError('Invalid date format');
        }
        
        await auditController.getAuditTrailByDateRange(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/audit/:patientId/action/:action
 * @desc Get the audit trail for a patient filtered by action
 * @access Private
 */
router.get('/:patientId/action', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.params.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        if (!req.query.action) {
            throw new errorHandler.errors.ValidationError('Action is required');
        }
        
        await auditController.getAuditTrailByAction(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/audit/:patientId/submitter
 * @desc Get the audit trail for a patient filtered by submitter
 * @access Private
 */
router.get('/:patientId/submitter', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.params.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        if (!req.query.submitterId) {
            throw new errorHandler.errors.ValidationError('Submitter ID is required');
        }
        
        if (!validators.isValidUserId(req.query.submitterId)) {
            throw new errorHandler.errors.ValidationError('Invalid submitter ID');
        }
        
        await auditController.getAuditTrailBySubmitter(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/audit/:patientId/tx/:txId
 * @desc Get a specific audit entry by transaction ID
 * @access Private
 */
router.get('/:patientId/tx/:txId', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.params.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        if (!validators.isValidTransactionId(req.params.txId)) {
            throw new errorHandler.errors.ValidationError('Invalid transaction ID');
        }
        
        await auditController.getAuditEntryByTxId(req, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
