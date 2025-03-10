'use strict';

const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const auth = require('../middleware/auth');
const validators = require('../utils/validators');
const errorHandler = require('../middleware/errorHandler');

/**
 * @route   POST /api/patients/register
 * @desc    Register a new patient record on the blockchain
 * @access  Private
 */
router.post('/register', auth.verifyToken, async (req, res, next) => {
    try {
        // Validate request body
        const validation = validators.validatePatientRegistration(req.body);
        if (!validation.isValid) {
            throw new errorHandler.errors.ValidationError(validation.errors.join(', '));
        }

        await patientController.registerPatient(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   PUT /api/patients/update
 * @desc    Update an existing patient record on the blockchain
 * @access  Private
 */
router.put('/update', auth.verifyToken, async (req, res, next) => {
    try {
        // Validate request body
        const validation = validators.validatePatientUpdate(req.body);
        if (!validation.isValid) {
            throw new errorHandler.errors.ValidationError(validation.errors.join(', '));
        }

        await patientController.updatePatient(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/patients/verify
 * @desc    Verify the integrity of a patient record
 * @access  Private
 */
router.post('/verify', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.body.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }

        if (!req.body.patientData) {
            throw new errorHandler.errors.ValidationError('Patient data is required');
        }

        await patientController.verifyPatient(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/patients/:patientId
 * @desc    Get a patient record from the blockchain
 * @access  Private
 */
router.get('/:patientId', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.params.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }

        await patientController.getPatient(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   DELETE /api/patients/:patientId
 * @desc    Delete a patient record from the blockchain (soft delete)
 * @access  Private
 */
router.delete('/:patientId', auth.verifyToken, async (req, res, next) => {
    try {
        if (!validators.isValidPatientId(req.params.patientId)) {
            throw new errorHandler.errors.ValidationError('Invalid patient ID');
        }

        await patientController.deletePatient(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/patients/hash
 * @desc    Generate a hash for patient data
 * @access  Private
 */
router.post('/hash', auth.verifyToken, async (req, res, next) => {
    try {
        if (!req.body.data) {
            throw new errorHandler.errors.ValidationError('Data is required');
        }

        await patientController.generateHash(req, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
