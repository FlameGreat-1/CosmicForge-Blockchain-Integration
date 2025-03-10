'use strict';
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const walletPath = path.join(process.cwd(), 'wallet');
const connectionProfilePath = path.join(process.cwd(), 'connection-profile.json');

class AccessController {
    constructor() {
        this.channelName = process.env.CHANNEL_NAME || 'cosmicforge';
        this.chaincodeName = process.env.CHAINCODE_NAME || 'patient-records';
        this.orgMspId = process.env.ORG_MSPID || 'Org1MSP';
    }

    async connect(userId) {
        try {
            const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
            
            const wallet = await Wallets.newFileSystemWallet(walletPath);
            
            const identity = await wallet.get(userId);
            if (!identity) {
                throw new Error(`Identity ${userId} does not exist in the wallet`);
            }
            
            const gateway = new Gateway();
            await gateway.connect(connectionProfile, {
                wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: false }
            });
            
            const network = await gateway.getNetwork(this.channelName);
            const contract = network.getContract(this.chaincodeName);
            
            return { gateway, contract };
        } catch (error) {
            throw new Error(`Failed to connect to the network: ${error.message}`);
        }
    }

    async grantAccess(req, res) {
        try {
            const { patientId, granteeId, permissions, expiryDate, userId } = req.body;
            
            if (!patientId || !granteeId || !permissions) {
                return res.status(400).json({ error: 'Patient ID, grantee ID, and permissions are required' });
            }
            
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                const permissionsStr = Array.isArray(permissions) ? permissions.join(',') : permissions;
                
                const result = await contract.submitTransaction(
                    'grantAccess',
                    patientId,
                    granteeId,
                    permissionsStr,
                    expiryDate || ''
                );
                
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    message: `Access granted to ${granteeId} for patient ${patientId}`,
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

    async revokeAccess(req, res) {
        try {
            const { patientId, granteeId, userId } = req.body;
            
            if (!patientId || !granteeId) {
                return res.status(400).json({ error: 'Patient ID and grantee ID are required' });
            }
            
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                const result = await contract.submitTransaction(
                    'revokeAccess',
                    patientId,
                    granteeId
                );
                
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    message: `Access revoked from ${granteeId} for patient ${patientId}`,
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

    async getAccessControlList(req, res) {
        try {
            const { patientId } = req.params;
            const { userId } = req.query;
            
            if (!patientId) {
                return res.status(400).json({ error: 'Patient ID is required' });
            }
            
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                const result = await contract.evaluateTransaction(
                    'getAccessControlList',
                    patientId
                );
                
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    accessControlList: response
                });
            } catch (error) {
                return res.status(404).json({ error: `Access control list not found: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async checkAccess(req, res) {
        try {
            const { patientId, identity, permission } = req.body;
            
            if (!patientId || !identity || !permission) {
                return res.status(400).json({ error: 'Patient ID, identity, and permission are required' });
            }
            
            const { gateway, contract } = await this.connect(req.user.id);
            
            try {
                const result = await contract.evaluateTransaction(
                    'checkAccess',
                    patientId,
                    identity,
                    permission
                );
                
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    accessCheck: response
                });
            } catch (error) {
                return res.status(500).json({ error: `Access check failed: ${error.message}` });
            } finally {
                gateway.disconnect();
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async updateAccessExpiry(req, res) {
        try {
            const { patientId, granteeId, expiryDate, userId } = req.body;
            
            if (!patientId || !granteeId || !expiryDate) {
                return res.status(400).json({ error: 'Patient ID, grantee ID, and expiry date are required' });
            }
            
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                const result = await contract.submitTransaction(
                    'updateAccessExpiry',
                    patientId,
                    granteeId,
                    expiryDate
                );
                
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    message: `Access expiry updated for ${granteeId} on patient ${patientId}`,
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

    async updateAccessPermissions(req, res) {
        try {
            const { patientId, granteeId, permissions, userId } = req.body;
            
            if (!patientId || !granteeId || !permissions) {
                return res.status(400).json({ error: 'Patient ID, grantee ID, and permissions are required' });
            }
            
            const { gateway, contract } = await this.connect(userId || req.user.id);
            
            try {
                const permissionsStr = Array.isArray(permissions) ? permissions.join(',') : permissions;
                
                const result = await contract.submitTransaction(
                    'updateAccessPermissions',
                    patientId,
                    granteeId,
                    permissionsStr
                );
                
                const response = JSON.parse(result.toString());
                
                return res.status(200).json({
                    success: true,
                    message: `Access permissions updated for ${granteeId} on patient ${patientId}`,
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
}

module.exports = new AccessController();
