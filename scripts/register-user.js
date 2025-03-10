#!/usr/bin/env node
/**
 * register-user.js - Script to register and enroll a new user with the Fabric CA
 * This script registers and enrolls a new user with the Fabric CA for the CosmicForge blockchain network
 */

'use strict';

const { Wallets, Gateway } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

// Default values (can be overridden by environment variables or command line arguments)
const orgMspId = process.env.ORG_MSPID || 'Org1MSP';
const adminUserId = process.env.ADMIN_ID || 'admin';
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

// Parse command line arguments
const args = process.argv.slice(2);
let userId = '';
let userRole = 'client';
let userAffiliation = 'org1.department1';

// Display usage information if no arguments provided
if (args.length < 1) {
    console.log(`${colors.bright}${colors.yellow}Usage: node register-user.js <userId> [role] [affiliation]${colors.reset}`);
    console.log(`  userId: The ID of the user to register (required)`);
    console.log(`  role: The role of the user (default: client)`);
    console.log(`  affiliation: The affiliation of the user (default: org1.department1)`);
    process.exit(1);
}

// Parse arguments
userId = args[0];
if (args.length > 1) userRole = args[1];
if (args.length > 2) userAffiliation = args[2];

/**
 * Register and enroll a new user with the Fabric CA
 */
async function main() {
    try {
        // Display script header
        console.log(`${colors.bright}${colors.yellow}===========================================================${colors.reset}`);
        console.log(`${colors.bright}${colors.yellow}       CosmicForge Blockchain User Registration            ${colors.reset}`);
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
        
        // Check to see if user already exists in the wallet
        console.log(`${colors.yellow}Checking if user "${userId}" exists in wallet...${colors.reset}`);
        const userIdentity = await wallet.get(userId);
        if (userIdentity) {
            console.log(`${colors.green}User "${userId}" already exists in the wallet${colors.reset}`);
            return;
        }
        
        // Check to see if admin user exists in the wallet
        console.log(`${colors.yellow}Checking if admin user exists in wallet...${colors.reset}`);
        const adminIdentity = await wallet.get(adminUserId);
        if (!adminIdentity) {
            console.error(`${colors.red}Error: Admin user "${adminUserId}" does not exist in the wallet. Please enroll the admin user first.${colors.reset}`);
            process.exit(1);
        }
        
        // Build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, adminUserId);
        
        // Register the user
        console.log(`${colors.yellow}Registering user "${userId}" with role "${userRole}" and affiliation "${userAffiliation}"...${colors.reset}`);
        const secret = await ca.register({
            affiliation: userAffiliation,
            enrollmentID: userId,
            role: userRole,
            attrs: [
                {
                    name: 'role',
                    value: userRole,
                    ecert: true
                }
            ]
        }, adminUser);
        
        // Enroll the user
        console.log(`${colors.yellow}Enrolling user "${userId}"...${colors.reset}`);
        const enrollment = await ca.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret
        });
        
        // Create the identity for the user
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgMspId,
            type: 'X.509',
        };
        
        // Import the identity into the wallet
        await wallet.put(userId, x509Identity);
        
        console.log(`${colors.green}Successfully registered and enrolled user "${userId}" with role "${userRole}" and imported it into the wallet${colors.reset}`);
        console.log(`${colors.green}===========================================================${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}Failed to register user: ${error}${colors.reset}`);
        process.exit(1);
    }
}

// Execute main function
main();
