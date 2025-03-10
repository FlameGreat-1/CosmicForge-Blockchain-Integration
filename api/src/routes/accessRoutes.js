'use strict';

const express = require('express');
const router = express.Router();
const accessController = require('../controllers/accessController');
const auth = require('../middleware/auth');
const validators = require('../utils/validators');
const errorHandler = require('../middleware/errorHandler');

/**
 * @route POST /api/access/grant
 * @desc Grant access to a patient record
 * @access Private
 */
router.post('/grant', auth.verifyToken, async (req, res, next) => {
    try {
        // Validate request body
        const validation = validators.validateAccessGrant(req.body);
        if (!validation.isValid) {
            throw new errorHandler.errors.ValidationError(validation.errors.join(', '));
        }
        
        await accessController.grantAccess(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/access/revoke
 * @desc Revoke access to a patient record
 * @access Private
 */
router.post('/revoke', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.body.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        if (!validators.isValidUserId(req.body.granteeId)) {
            throw new errorHandler.errors.ValidationError('Invalid grantee ID');
        }
        
        await accessController.revokeAccess(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/access/:patientId
 * @desc Get the access control list for a patient
 * @access Private
 */
router.get('/:patientId', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.params.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        await accessController.getAccessControlList(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/access/check
 * @desc Check if an identity has a specific permission for a patient
 * @access Private
 */
router.post('/check', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.body.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        if (!validators.isValidUserId(req.body.identity)) {
            throw new errorHandler.errors.ValidationError('Invalid identity');
        }
        
        if (!req.body.permission) {
            throw new errorHandler.errors.ValidationError('Permission is required');
        }
        
        await accessController.checkAccess(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route PUT /api/access/update-expiry
 * @desc Update the expiry date for access to a patient record
 * @access Private
 */
router.put('/update-expiry', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.body.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        if (!validators.isValidUserId(req.body.granteeId)) {
            throw new errorHandler.errors.ValidationError('Invalid grantee ID');
        }
        
        if (!validators.isValidDateString(req.body.expiryDate)) {
            throw new errorHandler.errors.ValidationError('Invalid expiry date');
        }
        
        await accessController.updateAccessExpiry(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route PUT /api/access/update-permissions
 * @desc Update the permissions for access to a patient record
 * @access Private
 */
router.put('/update-permissions', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.body.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }
        
        if (!validators.isValidUserId(req.body.granteeId)) {
            throw new errorHandler.errors.ValidationError('Invalid grantee ID');
        }
        
        if (!validators.isValidPermissions(req.body.permissions)) {
            throw new errorHandler.errors.ValidationError('Invalid permissions');
        }
        
        await accessController.updateAccessPermissions(req, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
