'use strict';
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const walletPath = path.join(process.cwd(), 'wallet');
const connectionProfilePath = path.join(process.cwd(), 'connection-profile.json');

class AuditController {
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

    async createAuditEntry(req, res) {
        try {
            const { patientId, action, dataHash, previousHash, metadata, userId } = req.body;
            
            if (!patientId || !action) {
                return res.status(400).json({ error: 'Patient ID and action are required' });
            }
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Create audit entry on blockchain
                const result = await contract.submitTransaction(
                    'createAuditEntry',
                    patientId,
                    action,
                    dataHash || '',
                    previousHash || '',
                    metadata ? JSON.stringify(metadata) : '{}'
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(201).json({
                    success: true,
                    message: 'Audit entry created successfully',
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

    async getAuditTrail(req, res) {
        try {
            const { patientId } = req.params;
            const { userId } = req.query;
            
            if (!patientId) {
                return res.status(400).json({ error: 'Patient ID is required' });
            }
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Get audit trail from blockchain
                const result = await contract.evaluateTransaction(
                    'getAuditTrail',
                    patientId
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    auditTrail: response
                });
            } catch (error) {
                return res.status(404).json({ error: `Audit trail not found: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getAuditTrailByDateRange(req, res) {
        try {
            const { patientId } = req.params;
            const { startDate, endDate, userId } = req.query;
            
            if (!patientId || !startDate || !endDate) {
                return res.status(400).json({ error: 'Patient ID, start date, and end date are required' });
            }
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Get audit trail by date range from blockchain
                const result = await contract.evaluateTransaction(
                    'getAuditTrailByDateRange',
                    patientId,
                    startDate,
                    endDate
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    auditTrail: response,
                    filter: {
                        startDate,
                        endDate
                    }
                });
            } catch (error) {
                return res.status(404).json({ error: `Audit trail not found: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getAuditTrailByAction(req, res) {
        try {
            const { patientId } = req.params;
            const { action, userId } = req.query;
            
            if (!patientId || !action) {
                return res.status(400).json({ error: 'Patient ID and action are required' });
            }
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Get audit trail by action from blockchain
                const result = await contract.evaluateTransaction(
                    'getAuditTrailByAction',
                    patientId,
                    action
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    auditTrail: response,
                    filter: {
                        action
                    }
                });
            } catch (error) {
                return res.status(404).json({ error: `Audit trail not found: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getAuditTrailBySubmitter(req, res) {
        try {
            const { patientId } = req.params;
            const { submitterId, userId } = req.query;
            
            if (!patientId || !submitterId) {
                return res.status(400).json({ error: 'Patient ID and submitter ID are required' });
            }
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Get audit trail by submitter from blockchain
                const result = await contract.evaluateTransaction(
                    'getAuditTrailBySubmitter',
                    patientId,
                    submitterId
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    auditTrail: response,
                    filter: {
                        submitterId
                    }
                });
            } catch (error) {
                return res.status(404).json({ error: `Audit trail not found: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getAuditEntryByTxId(req, res) {
        try {
            const { patientId, txId } = req.params;
            const { userId } = req.query;
            
            if (!patientId || !txId) {
                return res.status(400).json({ error: 'Patient ID and transaction ID are required' });
            }
            
            // Connect to the network
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                // Get audit entry by transaction ID from blockchain
                const result = await contract.evaluateTransaction(
                    'getAuditEntryByTxId',
                    patientId,
                    txId
                );
                
                // Parse the result
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    auditEntry: response
                });
            } catch (error) {
                return res.status(404).json({ error: `Audit entry not found: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AuditController();
