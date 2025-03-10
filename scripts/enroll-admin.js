#!/usr/bin/env node
/**
 * enroll-admin.js - Script to enroll an admin user with the Fabric CA
 * This script enrolls an admin user with the Fabric CA for the CosmicForge blockchain network
 */

'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

// Default values (can be overridden by environment variables)
const orgMspId = process.env.ORG_MSPID || 'Org1MSP';
const adminUserId = process.env.ADMIN_ID || 'admin';
const adminUserPasswd = process.env.ADMIN_PASSWORD || 'adminpw';
const connectionProfilePath = process.env.CONNECTION_PROFILE_PATH || '../network/connection-profiles/org1.json';
const walletPath = process.env.WALLET_PATH || '../wallet';

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m'
};

/**
 * Enroll admin user with the Fabric CA
 */
async function main() {
    try {
        // Display script header
        console.log(`${colors.bright}${colors.yellow}===========================================================${colors.reset}`);
        console.log(`${colors.bright}${colors.yellow}       CosmicForge Blockchain Admin Enrollment              ${colors.reset}`);
        console.log(`${colors.bright}${colors.yellow}===========================================================${colors.reset}`);
        
        // Load the connection profile
        console.log(`${colors.yellow}Loading connection profile from: ${connectionProfilePath}${colors.reset}`);
        const ccpPath = path.resolve(connectionProfilePath);
        
        if (!fs.existsSync(ccpPath)) {
            console.error(`${colors.red}Error: Connection profile not found at ${ccpPath}${colors.reset}`);
            process.exit(1);
        }
        
        const connectionProfile = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        
        // Create a new CA client for interacting with the CA
        console.log(`${colors.yellow}Creating CA client for ${orgMspId}...${colors.reset}`);
        
        const caInfo = connectionProfile.certificateAuthorities[`ca.org1.example.com`];
        if (!caInfo) {
            console.error(`${colors.red}Error: CA information not found in connection profile${colors.reset}`);
            process.exit(1);
        }
        
        const caTLSCACerts = caInfo.tlsCACerts.pem || caInfo.tlsCACerts.path;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
        
        // Create a new file system based wallet for managing identities
        console.log(`${colors.yellow}Creating wallet at: ${walletPath}${colors.reset}`);
        const walletDirectory = path.resolve(walletPath);
        
        // Create wallet directory if it doesn't exist
        if (!fs.existsSync(walletDirectory)) {
            fs.mkdirSync(walletDirectory, { recursive: true });
            console.log(`${colors.green}Created wallet directory at: ${walletDirectory}${colors.reset}`);
        }
        
        const wallet = await Wallets.newFileSystemWallet(walletDirectory);
        
        // Check to see if admin user already exists in the wallet
        console.log(`${colors.yellow}Checking if admin user exists in wallet...${colors.reset}`);
        const identity = await wallet.get(adminUserId);
        if (identity) {
            console.log(`${colors.green}Admin user "${adminUserId}" already exists in the wallet${colors.reset}`);
            return;
        }
        
        // Enroll the admin user
        console.log(`${colors.yellow}Enrolling admin user "${adminUserId}"...${colors.reset}`);
        const enrollment = await ca.enroll({ 
            enrollmentID: adminUserId, 
            enrollmentSecret: adminUserPasswd 
        });
        
        // Create the identity for the admin user
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgMspId,
            type: 'X.509',
        };
        
        // Import the identity into the wallet
        await wallet.put(adminUserId, x509Identity);
        
        console.log(`${colors.green}Successfully enrolled admin user "${adminUserId}" and imported it into the wallet${colors.reset}`);
        console.log(`${colors.green}===========================================================${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}Failed to enroll admin user: ${error}${colors.reset}`);
        process.exit(1);
    }
}

// Execute main function
main();
