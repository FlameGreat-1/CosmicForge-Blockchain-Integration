'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Network configuration for CosmicForge blockchain integration
 */
const networkConfig = {
    // Channel configuration
    channelName: process.env.CHANNEL_NAME || 'cosmicforge',
    
    // Chaincode configuration
    chaincodeName: process.env.CHAINCODE_NAME || 'patient-records',
    chaincodeVersion: process.env.CHAINCODE_VERSION || '1.0',
    
    // Organization configuration
    orgName: process.env.ORG_NAME || 'Org1',
    orgMspId: process.env.ORG_MSPID || 'Org1MSP',
    
    // Peer configuration
    peerEndpoint: process.env.PEER_ENDPOINT || 'peer0.org1.example.com:7051',
    peerHostAlias: process.env.PEER_HOST_ALIAS || 'peer0.org1.example.com',
    
    // CA configuration
    caName: process.env.CA_NAME || 'ca.org1.example.com',
    caEndpoint: process.env.CA_ENDPOINT || 'ca.org1.example.com:7054',
    
    // Orderer configuration
    ordererEndpoint: process.env.ORDERER_ENDPOINT || 'orderer.example.com:7050',
    ordererHostAlias: process.env.ORDERER_HOST_ALIAS || 'orderer.example.com',
    
    // Wallet configuration
    walletPath: process.env.WALLET_PATH || path.join(process.cwd(), 'wallet'),
    
    // Connection profile
    connectionProfilePath: process.env.CONNECTION_PROFILE_PATH || path.join(process.cwd(), 'connection-profile.json'),
    
    // Get connection profile as object
    getConnectionProfile: () => {
        try {
            const ccpPath = networkConfig.connectionProfilePath;
            const fileExists = fs.existsSync(ccpPath);
            if (!fileExists) {
                throw new Error(`Connection profile not found at ${ccpPath}`);
            }
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
            return ccp;
        } catch (error) {
            throw new Error(`Failed to load connection profile: ${error.message}`);
        }
    },
    
    // Generate connection profile from environment variables
    generateConnectionProfile: () => {
        const connectionProfile = {
            name: 'cosmicforge-network',
            version: '1.0.0',
            client: {
                organization: networkConfig.orgName,
                connection: {
                    timeout: {
                        peer: {
                            endorser: 300,
                            eventHub: 300,
                            eventReg: 300
                        },
                        orderer: 300
                    }
                }
            },
            channels: {
                [networkConfig.channelName]: {
                    orderers: [networkConfig.ordererHostAlias],
                    peers: {
                        [networkConfig.peerHostAlias]: {
                            endorsingPeer: true,
                            chaincodeQuery: true,
                            ledgerQuery: true,
                            eventSource: true
                        }
                    }
                }
            },
            organizations: {
                [networkConfig.orgName]: {
                    mspid: networkConfig.orgMspId,
                    peers: [networkConfig.peerHostAlias],
                    certificateAuthorities: [networkConfig.caName]
                }
            },
            orderers: {
                [networkConfig.ordererHostAlias]: {
                    url: `grpcs://${networkConfig.ordererEndpoint}`,
                    grpcOptions: {
                        'ssl-target-name-override': networkConfig.ordererHostAlias,
                        hostnameOverride: networkConfig.ordererHostAlias
                    },
                    tlsCACerts: {
                        path: process.env.ORDERER_TLS_CERT || path.join(os.homedir(), '.fabric-ca-client', 'tls-root-cert', 'tls-ca-cert.pem')
                    }
                }
            },
            peers: {
                [networkConfig.peerHostAlias]: {
                    url: `grpcs://${networkConfig.peerEndpoint}`,
                    grpcOptions: {
                        'ssl-target-name-override': networkConfig.peerHostAlias,
                        hostnameOverride: networkConfig.peerHostAlias
                    },
                    tlsCACerts: {
                        path: process.env.PEER_TLS_CERT || path.join(os.homedir(), '.fabric-ca-client', 'tls-root-cert', 'tls-ca-cert.pem')
                    }
                }
            },
            certificateAuthorities: {
                [networkConfig.caName]: {
                    url: `https://${networkConfig.caEndpoint}`,
                    caName: networkConfig.caName,
                    tlsCACerts: {
                        path: process.env.CA_TLS_CERT || path.join(os.homedir(), '.fabric-ca-client', 'tls-root-cert', 'tls-ca-cert.pem')
                    },
                    httpOptions: {
                        verify: false
                    }
                }
            }
        };
        
        return connectionProfile;
    },
    
    // Save generated connection profile to file
    saveConnectionProfile: (connectionProfile) => {
        try {
            const ccpPath = networkConfig.connectionProfilePath;
            fs.writeFileSync(ccpPath, JSON.stringify(connectionProfile, null, 2));
            return true;
        } catch (error) {
            throw new Error(`Failed to save connection profile: ${error.message}`);
        }
    }
};

module.exports = networkConfig;
