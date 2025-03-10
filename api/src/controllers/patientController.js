'use strict';
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const walletPath = path.join(process.cwd(), 'wallet');
const connectionProfilePath = path.join(process.cwd(), 'connection-profile.json');

class PatientController {
    constructor() {
        this.channelName = process.env.CHANNEL_NAME || 'cosmicforge';
        this.chaincodeName = process.env.CHAINCODE_NAME || 'patient-records';
        this.orgMspId = process.env.ORG_MSPID || 'Org1MSP';
    }

    async connect(userId) {
        try {
            // Load connection profile
            const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
            
            // Create a new wallet for identity
            const wallet = await Wallets.newFileSystemWallet(walletPath);
            
            // Check if user identity exists in the wallet
            const identity = await wallet.get(userId);
            if (!identity) {
                throw new Error(`Identity ${userId} does not exist in the wallet`);
            }
            
            // Create a new gateway for connecting to the peer node
            const gateway = new Gateway();
            await gateway.connect(connectionProfile, {
                wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: false }
            });
            
            // Get the network and contract
            const network = await gateway.getNetwork(this.channelName);
            const contract = network.getContract(this.chaincodeName);
            
            return { gateway, contract };
        } catch (error) {
            throw new Error(`Failed to connect to the network: ${error.message}`);
        }
    }

    async registerPatient(req, res) {
        try {
            const { patientId, patientData, userId } = req.body;
            
            if (!patientId || !patientData) {
                return res.status(400).json({ error: 'Patient ID and data are required' });
            }
            
            // Generate hash of patient data
            const dataHash = crypto.createHash('sha256').update(JSON.stringify(patientData)).digest('hex');
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Create metadata object
                const metadata = JSON.stringify({
                    dataType: 'patient',
                    createdAt: new Date().toISOString(),
                    dataSize: Buffer.byteLength(JSON.stringify(patientData)),
                    contentType: 'application/json'
                });
                
                // Register patient record on blockchain
                const result = await contract.submitTransaction(
                    'registerPatientRecord',
                    patientId,
                    dataHash,
                    metadata,
                    this.orgMspId
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(201).json({
                    success: true,
                    message: 'Patient registered successfully',
                    blockchainResponse: response,
                    patientId,
                    dataHash
                });
            } catch (error) {
                return res.status(500).json({ error: `Transaction failed: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async updatePatient(req, res) {
        try {
            const { patientId, patientData, previousHash, userId } = req.body;
            
            if (!patientId || !patientData) {
                return res.status(400).json({ error: 'Patient ID and data are required' });
            }
            
            // Generate hash of patient data
            const newDataHash = crypto.createHash('sha256').update(JSON.stringify(patientData)).digest('hex');
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Create metadata object
                const metadata = JSON.stringify({
                    dataType: 'patient',
                    updatedAt: new Date().toISOString(),
                    dataSize: Buffer.byteLength(JSON.stringify(patientData)),
                    contentType: 'application/json'
                });
                
                // Update patient record on blockchain
                const result = await contract.submitTransaction(
                    'updatePatientRecord',
                    patientId,
                    newDataHash,
                    previousHash || '',
                    metadata
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    message: 'Patient record updated successfully',
                    blockchainResponse: response,
                    patientId,
                    dataHash: newDataHash
                });
            } catch (error) {
                return res.status(500).json({ error: `Transaction failed: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async verifyPatient(req, res) {
        try {
            const { patientId, patientData, userId } = req.body;
            
            if (!patientId || !patientData) {
                return res.status(400).json({ error: 'Patient ID and data are required' });
            }
            
            // Generate hash of patient data
            const dataHash = crypto.createHash('sha256').update(JSON.stringify(patientData)).digest('hex');
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Verify patient record on blockchain
                const result = await contract.evaluateTransaction(
                    'verifyPatientRecord',
                    patientId,
                    dataHash
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    verification: response,
                    patientId,
                    dataHash
                });
            } catch (error) {
                return res.status(500).json({ error: `Verification failed: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getPatient(req, res) {
        try {
            const { patientId } = req.params;
            const { userId } = req.query;
            
            if (!patientId) {
                return res.status(400).json({ error: 'Patient ID is required' });
            }
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Get patient record from blockchain
                const result = await contract.evaluateTransaction(
                    'getPatientRecord',
                    patientId
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    patient: response
                });
            } catch (error) {
                return res.status(404).json({ error: `Patient not found: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async deletePatient(req, res) {
        try {
            const { patientId } = req.params;
            const { userId } = req.body;
            
            if (!patientId) {
                return res.status(400).json({ error: 'Patient ID is required' });
            }
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Delete patient record from blockchain
                const result = await contract.submitTransaction(
                    'deletePatientRecord',
                    patientId
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    message: 'Patient record deleted successfully',
                    blockchainResponse: response
                });
            } catch (error) {
                return res.status(500).json({ error: `Transaction failed: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async generateHash(req, res) {
        try {
            const { data } = req.body;
            
            if (!data) {
                return res.status(400).json({ error: 'Data is required' });
            }
            
            // Generate hash of data
            const dataHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
            
            return res.status(200).json({
                success: true,
                dataHash,
                algorithm: 'sha256'
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PatientController();
