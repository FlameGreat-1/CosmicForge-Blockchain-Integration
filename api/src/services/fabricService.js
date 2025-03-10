'use strict';
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class FabricService {
    constructor() {
        this.channelName = process.env.CHANNEL_NAME || 'cosmicforge';
        this.chaincodeName = process.env.CHAINCODE_NAME || 'patient-records';
        this.walletPath = process.env.WALLET_PATH || path.join(process.cwd(), 'wallet');
        this.connectionProfilePath = process.env.CONNECTION_PROFILE_PATH || path.join(process.cwd(), 'connection-profile.json');
        this.orgMspId = process.env.ORG_MSPID || 'Org1MSP';
    }

    async getConnectionProfile() {
        try {
            const connectionProfile = JSON.parse(fs.readFileSync(this.connectionProfilePath, 'utf8'));
            return connectionProfile;
        } catch (error) {
            logger.error(`Failed to read connection profile: ${error.message}`);
            throw new Error(`Failed to read connection profile: ${error.message}`);
        }
    }

    async getWallet() {
        try {
            const wallet = await Wallets.newFileSystemWallet(this.walletPath);
            return wallet;
        } catch (error) {
            logger.error(`Failed to create wallet: ${error.message}`);
            throw new Error(`Failed to create wallet: ${error.message}`);
        }
    }

    async connect(userId) {
        try {
            const connectionProfile = await this.getConnectionProfile();
            const wallet = await this.getWallet();
            
            const identity = await wallet.get(userId);
            if (!identity) {
                logger.error(`Identity ${userId} does not exist in the wallet`);
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
            
            return { gateway, network, contract };
        } catch (error) {
            logger.error(`Failed to connect to the network: ${error.message}`);
            throw new Error(`Failed to connect to the network: ${error.message}`);
        }
    }

    async submitTransaction(userId, functionName, ...args) {
        let gateway;
        try {
            const { gateway: gw, contract } = await this.connect(userId);
            gateway = gw;
            
            logger.info(`Submitting transaction: ${functionName} with args: ${args}`);
            const result = await contract.submitTransaction(functionName, ...args);
            
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error(`Failed to submit transaction: ${error.message}`);
            throw new Error(`Failed to submit transaction: ${error.message}`);
        } finally {
            if (gateway) {
                gateway.disconnect();
            }
        }
    }

    async evaluateTransaction(userId, functionName, ...args) {
        let gateway;
        try {
            const { gateway: gw, contract } = await this.connect(userId);
            gateway = gw;
            
            logger.info(`Evaluating transaction: ${functionName} with args: ${args}`);
            const result = await contract.evaluateTransaction(functionName, ...args);
            
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error(`Failed to evaluate transaction: ${error.message}`);
            throw new Error(`Failed to evaluate transaction: ${error.message}`);
        } finally {
            if (gateway) {
                gateway.disconnect();
            }
        }
    }

    async getBlockByNumber(userId, blockNumber) {
        let gateway;
        try {
            const { gateway: gw, network } = await this.connect(userId);
            gateway = gw;
            
            const channel = network.getChannel();
            const block = await channel.queryBlock(parseInt(blockNumber));
            
            return block;
        } catch (error) {
            logger.error(`Failed to get block: ${error.message}`);
            throw new Error(`Failed to get block: ${error.message}`);
        } finally {
            if (gateway) {
                gateway.disconnect();
            }
        }
    }

    async getTransactionByID(userId, txId) {
        let gateway;
        try {
            const { gateway: gw, network } = await this.connect(userId);
            gateway = gw;
            
            const channel = network.getChannel();
            const transaction = await channel.queryTransaction(txId);
            
            return transaction;
        } catch (error) {
            logger.error(`Failed to get transaction: ${error.message}`);
            throw new Error(`Failed to get transaction: ${error.message}`);
        } finally {
            if (gateway) {
                gateway.disconnect();
            }
        }
    }

    async getBlockHeight(userId) {
        let gateway;
        try {
            const { gateway: gw, network } = await this.connect(userId);
            gateway = gw;
            
            const channel = network.getChannel();
            const info = await channel.queryInfo();
            
            return parseInt(info.height.toString());
        } catch (error) {
            logger.error(`Failed to get block height: ${error.message}`);
            throw new Error(`Failed to get block height: ${error.message}`);
        } finally {
            if (gateway) {
                gateway.disconnect();
            }
        }
    }

    async getChannelConfig(userId) {
        let gateway;
        try {
            const { gateway: gw, network } = await this.connect(userId);
            gateway = gw;
            
            const channel = network.getChannel();
            const config = await channel.getChannelConfig();
            
            return config;
        } catch (error) {
            logger.error(`Failed to get channel config: ${error.message}`);
            throw new Error(`Failed to get channel config: ${error.message}`);
        } finally {
            if (gateway) {
                gateway.disconnect();
            }
        }
    }
}

module.exports = new FabricService();
