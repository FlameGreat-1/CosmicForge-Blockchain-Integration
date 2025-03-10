# CosmicForge Blockchain Integration

![CosmicForge Logo](https://via.placeholder.com/150x50?text=CosmicForge)

A secure, HIPAA-compliant blockchain solution for medical records management in the CosmicForge telemedicine platform.

## Overview

CosmicForge Blockchain Integration provides a robust, secure, and compliant infrastructure for managing patient medical records using Hyperledger Fabric. The system implements a hybrid approach where:

- Patient data is stored off-chain for privacy and performance
- Cryptographic hashes of records are stored on-chain for verification
- Access control policies are managed on the blockchain
- Comprehensive audit trails are maintained for regulatory compliance

This architecture ensures data integrity, secure access control, and complete auditability while maintaining HIPAA compliance.

## Architecture

![Architecture Diagram](https://via.placeholder.com/800x400?text=CosmicForge+Blockchain+Architecture)

The system consists of the following components:

### Smart Contracts (Chaincode)

- **Patient Record Contract**: Manages the lifecycle of patient record hashes
- **Access Control Contract**: Handles permissions and access policies
- **Audit Trail Contract**: Records all actions performed on patient data

### API Layer

RESTful API that provides:
- Patient record management
- Access control operations
- Audit trail queries
- Identity management

### Blockchain Network

- Two-organization network (Hospital and Patient organizations)
- Orderer service for transaction ordering
- Certificate Authorities for identity management
- Peers for transaction validation and ledger maintenance

## Prerequisites

- Docker and Docker Compose (v19.03.0+)
- Node.js (v14.0.0+)
- npm (v6.0.0+)
- Hyperledger Fabric binaries (v2.4.0+)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cosmicforge/blockchain-integration.git
   cd cosmicforge-blockchain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp api/.env.example api/.env
   # Edit api/.env with your configuration
   ```

4. Deploy the network:
   ```bash
   npm run deploy:network
   ```

5. Deploy the chaincode:
   ```bash
   npm run deploy:chaincode
   ```

6. Enroll the admin user:
   ```bash
   npm run enroll:admin
   ```

## Usage

### Starting the API Server

```bash
npm start
```

### Registering a New User

```bash
npm run register:user -- <userId> <role> <affiliation>
```

Example:
```bash
npm run register:user -- doctor1 doctor org1.medical
```

## API Endpoints

### Patient Records

- **POST /api/patients/register** - Register a new patient record
- **PUT /api/patients/update** - Update an existing patient record
- **GET /api/patients/:patientId** - Get a patient record
- **POST /api/patients/verify** - Verify the integrity of a patient record
- **DELETE /api/patients/:patientId** - Delete a patient record (soft delete)

### Access Control

- **POST /api/access/grant** - Grant access to a patient record
- **POST /api/access/revoke** - Revoke access to a patient record
- **GET /api/access/:patientId** - Get the access control list for a patient
- **POST /api/access/check** - Check if an identity has a specific permission

### Audit Trail

- **POST /api/audit/create** - Create a new audit entry
- **GET /api/audit/:patientId** - Get the audit trail for a patient
- **GET /api/audit/:patientId/date-range** - Get the audit trail within a date range

## Docker Deployment

Build and run the API container:
```bash
npm run docker:build
docker-compose -f network/docker/docker-compose.yaml up -d api
```

For Runpod.io deployment:
```bash
docker-compose -f network/docker/runpod-deploy.yaml up -d
```

## Monitoring

Start the monitoring stack (Prometheus and Grafana):
```bash
npm run monitor:start
```

Access Grafana at http://localhost:3000 (default credentials: admin/admin)

## Development

### Running in Development Mode

```bash
npm run dev
```

### Testing

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:api
npm run test:chaincode
```

### Linting

```bash
npm run lint
```

## Project Structure

```
cosmicforge-blockchain/
├── chaincode/
│   ├── patient-records/
│   │   ├── lib/
│   │   │   ├── patient-record.js
│   │   │   ├── access-control.js
│   │   │   └── audit-trail.js
│   │   ├── index.js
│   │   ├── package.json
│   │   └── test/
│   └── package.json
├── network/
│   ├── configtx/
│   │   └── configtx.yaml
│   ├── connection-profiles/
│   │   ├── org1.json
│   │   └── org2.json
│   ├── crypto-config/
│   └── docker/
│       ├── docker-compose.yaml
│       └── runpod-deploy.yaml
├── api/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── patientController.js
│   │   │   ├── auditController.js
│   │   │   └── accessController.js
│   │   ├── services/
│   │   │   ├── fabricService.js
│   │   │   ├── hashingService.js
│   │   │   └── walletService.js
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   └── validators.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── patientRoutes.js
│   │   │   ├── auditRoutes.js
│   │   │   └── accessRoutes.js
│   │   ├── config/
│   │   │   ├── network.js
│   │   │   └── app.js
│   │   └── app.js
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── scripts/
│   ├── deploy-network.sh
│   ├── deploy-chaincode.sh
│   ├── enroll-admin.js
│   ├── register-user.js
│   └── backup-wallet.sh
├── monitoring/
│   ├── prometheus/
│   └── grafana/
├── wallet/
├── .gitignore
├── package.json
└── README.md

