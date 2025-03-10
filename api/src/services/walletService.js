'use strict';

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class WalletService {
    constructor() {
        this.walletPath = process.env.WALLET_PATH || path.join(process.cwd(), 'wallet');
        this.connectionProfilePath = process.env.CONNECTION_PROFILE_PATH || path.join(process.cwd(), 'connection-profile.json');
        this.caName = process.env.CA_NAME || 'ca.org1.example.com';
        this.orgMspId = process.env.ORG_MSPID || 'Org1MSP';
    }

    /**
     * Get the wallet instance
     * @returns {Promise<Wallet>}
     */
    async getWallet() {
        try {
            const wallet = await Wallets.newFileSystemWallet(this.walletPath);
            return wallet;
        } catch (error) {
            logger.error(`Failed to create wallet: ${error.message}`);
            throw new Error(`Failed to create wallet: ${error.message}`);
        }
    }

    /**
     * Get the CA client instance
     * @returns {Promise<FabricCAServices>}
     */
    async getCaClient() {
        try {
            const connectionProfile = JSON.parse(fs.readFileSync(this.connectionProfilePath, 'utf8'));
            const caInfo = connectionProfile.certificateAuthorities[this.caName];

            if (!caInfo) {
                throw new Error(`CA information not found for ${this.caName}`);
            }

            const caTLSCACerts = caInfo.tlsCACerts.pem;
            const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

            return ca;
        } catch (error) {
            logger.error(`Failed to create CA client: ${error.message}`);
            throw new Error(`Failed to create CA client: ${error.message}`);
        }
    }

    /**
     * Enroll an admin identity
     * @param {String} adminId
     * @param {String} adminSecret
     * @returns {Promise<Object>}
     */
    async enrollAdmin(adminId, adminSecret) {
        try {
            const wallet = await this.getWallet();

            // Check if admin identity already exists
            const identity = await wallet.get(adminId);
            if (identity) {
                logger.info(`Admin identity ${adminId} already exists in the wallet`);
                return { success: true, message: `Admin identity ${adminId} already exists in the wallet` };
            }

            // Enroll the admin
            const ca = await this.getCaClient();
            const enrollment = await ca.enroll({ enrollmentID: adminId, enrollmentSecret: adminSecret });

            // Create the identity
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: this.orgMspId,
                type: 'X.509',
            };

            // Import the identity into the wallet
            await wallet.put(adminId, x509Identity);

            logger.info(`Admin identity ${adminId} enrolled and imported to wallet successfully`);
            return { success: true, message: `Admin identity ${adminId} enrolled and imported to wallet successfully` };
        } catch (error) {
            logger.error(`Failed to enroll admin: ${error.message}`);
            throw new Error(`Failed to enroll admin: ${error.message}`);
        }
    }

    /**
     * Register a new user identity
     * @param {String} userId
     * @param {String} userAffiliation
     * @param {String} adminId
     * @returns {Promise<Object>}
     */
    async registerUser(userId, userAffiliation, adminId) {
        try {
            const wallet = await this.getWallet();

            // Check if user identity already exists
            const userIdentity = await wallet.get(userId);
            if (userIdentity) {
                logger.info(`User identity ${userId} already exists in the wallet`);
                return { success: true, message: `User identity ${userId} already exists in the wallet` };
            }

            // Check if admin identity exists
            const adminIdentity = await wallet.get(adminId);
            if (!adminIdentity) {
                logger.error(`Admin identity ${adminId} does not exist in the wallet`);
                throw new Error(`Admin identity ${adminId} does not exist in the wallet`);
            }

            // Create a CA client using admin credentials
            const ca = await this.getCaClient();
            const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
            const adminUser = await provider.getUserContext(adminIdentity, adminId);

            // Register the user
            const secret = await ca.register(
                { affiliation: userAffiliation || 'org1.department1', enrollmentID: userId, role: 'client' },
                adminUser
            );

            // Enroll the user
            const enrollment = await ca.enroll({ enrollmentID: userId, enrollmentSecret: secret });

            // Create the identity
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: this.orgMspId,
                type: 'X.509',
            };

            // Import the identity into the wallet
            await wallet.put(userId, x509Identity);

            logger.info(`User identity ${userId} registered and imported to wallet successfully`);
            return { success: true, message: `User identity ${userId} registered and imported to wallet successfully`, secret };
        } catch (error) {
            logger.error(`Failed to register user: ${error.message}`);
            throw new Error(`Failed to register user: ${error.message}`);
        }
    }

    /**
     * Get user identity details
     * @param {String} userId
     * @returns {Promise<Object>}
     */
    async getUserIdentity(userId) {
        try {
            const wallet = await this.getWallet();

            // Check if user identity exists
            const identity = await wallet.get(userId);
            if (!identity) {
                logger.error(`User identity ${userId} does not exist in the wallet`);
                throw new Error(`User identity ${userId} does not exist in the wallet`);
            }

            return { success: true, exists: true, mspId: identity.mspId, type: identity.type };
        } catch (error) {
            logger.error(`Failed to get user identity: ${error.message}`);
            throw new Error(`Failed to get user identity: ${error.message}`);
        }
    }

    /**
     * Get all identities stored in the wallet
     * @returns {Promise<Object>}
     */
    async getAllIdentities() {
        try {
            const wallet = await this.getWallet();
            const identities = await wallet.list();

            return { success: true, identities };
        } catch (error) {
            logger.error(`Failed to get all identities: ${error.message}`);
            throw new Error(`Failed to get all identities: ${error.message}`);
        }
    }

    /**
     * Delete an identity from the wallet
     * @param {String} userId
     * @returns {Promise<Object>}
     */
    async deleteIdentity(userId) {
        try {
            const wallet = await this.getWallet();

            // Check if user identity exists
            const identity = await wallet.get(userId);
            if (!identity) {
                logger.error(`User identity ${userId} does not exist in the wallet`);
                throw new Error(`User identity ${userId} does not exist in the wallet`);
            }

            // Delete the identity
            await wallet.remove(userId);

            logger.info(`User identity ${userId} deleted from wallet successfully`);
            return { success: true, message: `User identity ${userId} deleted from wallet successfully` };
        } catch (error) {
            logger.error(`Failed to delete identity: ${error.message}`);
            throw new Error(`Failed to delete identity: ${error.message}`);
        }
    }

    /**
     * Backup the wallet to a specified location
     * @param {String} backupPath
     * @returns {Promise<Object>}
     */
    async backupWallet(backupPath) {
        try {
            const targetPath = backupPath || path.join(process.cwd(), 'wallet-backup', `backup-${Date.now()}`);

            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.cpSync(this.walletPath, targetPath, { recursive: true });

            logger.info(`Wallet backed up successfully to ${targetPath}`);
            return { success: true, message: `Wallet backed up successfully to ${targetPath}`, backupPath: targetPath };
        } catch (error) {
            logger.error(`Failed to backup wallet: ${error.message}`);
            throw new Error(`Failed to backup wallet: ${error.message}`);
        }
    }
}

module.exports = new WalletService();
