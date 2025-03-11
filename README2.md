# Complete Guide: Deploying CosmicForge Blockchain on RunPod

## Table of Contents
- [Prerequisites](#prerequisites)
- [Step 1: Prepare Your RunPod Account](#step-1-prepare-your-runpod-account)
- [Step 2: Prepare Your Repository](#step-2-prepare-your-repository)
- [Step 3: Deploy on RunPod](#step-3-deploy-on-runpod)
- [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
- [Step 5: Deploy the Blockchain Network](#step-5-deploy-the-blockchain-network)
- [Step 6: Deploy Chaincode](#step-6-deploy-chaincode)
- [Step 7: Set Up Identity Management](#step-7-set-up-identity-management)
- [Step 8: Start the API Server](#step-8-start-the-api-server)
- [Step 9: Configure Networking](#step-9-configure-networking)
- [Step 10: Test the Deployment](#step-10-test-the-deployment)
- [Step 11: Set Up Monitoring (Optional)](#step-11-set-up-monitoring-optional)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Prerequisites

- GitHub account with repository access
- Basic knowledge of Docker and blockchain concepts
- RunPod account with payment method added

## Step 1: Prepare Your RunPod Account

### Create a RunPod account
1. Go to [RunPod.io](https://www.runpod.io/) and sign up
2. Add payment method (required for deployment)

### Select a template
1. From Dashboard, click "Deploy"
2. Select "Docker" template (not GPU)
3. Choose a configuration with at least:
   - 4 CPU cores
   - 8GB RAM
   - 50GB storage
4. Select a data center location close to your users

## Step 2: Prepare Your Repository

### Ensure your repository is ready
1. Verify all files are committed to GitHub
2. Make sure `network/docker/runpod-deploy.yaml` exists and is configured

### Create a deployment token (optional but recommended)
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with "repo" scope
3. Copy the token for later use

## Step 3: Deploy on RunPod

### Create the Pod
1. Click "Deploy" on your selected template
2. Name your pod (e.g., "cosmicforge-blockchain")
3. Set container image to: `docker:dind` (Docker-in-Docker)
4. Set exposed ports: 3000 (for API)
5. Click "Deploy"

### Connect to Pod
1. Once deployed, click "Connect" → "Start SSH"
2. This opens a terminal connected to your RunPod instance

### Clone your repository
```bash
# Install git
apk add --no-cache git

# Clone repository (use token if private)
git clone https://github.com/FlameGreat-1/CosmicForge-Blockchain-Integration.git
cd CosmicForge-Blockchain-Integration
```

### Install dependencies
```bash
# Install Node.js and npm
apk add --no-cache nodejs npm

# Install Fabric binaries
apk add --no-cache curl bash
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.0 1.5.2
export PATH=$PATH:$PWD/fabric-samples/bin

# Install project dependencies
npm install
```

## Step 4: Configure Environment Variables

### Set up environment variables
1. Go to RunPod dashboard → Your pod → "Environment Variables"
2. Add the following variables:
   - `JWT_SECRET`: A strong random string
   - `ADMIN_ID`: Admin username
   - `ADMIN_PASSWORD`: Admin password
   - `CHANNEL_NAME`: cosmicforge
   - `CHAINCODE_NAME`: patient-records
   - `ORGANIZATION_MSPID`: Org1MSP
   - `CONNECTION_PROFILE_PATH`: ../network/connection-profiles/org1.json

### Apply variables
1. Click "Save" to apply the environment variables
2. Your pod will restart automatically

## Step 5: Deploy the Blockchain Network

### Make scripts executable
```bash
chmod +x scripts/*.sh
```

### Deploy the network
```bash
# Deploy using the RunPod-specific compose file
cd network/docker
docker-compose -f runpod-deploy.yaml up -d
cd ../..

# Wait for network to stabilize
sleep 30
```

### Create and join channel
```bash
# Use the CLI container to create and join channel
docker exec cli peer channel create -o orderer.example.com:7050 -c cosmicforge -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/cosmicforge.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

docker exec cli peer channel join -b cosmicforge.block
```

## Step 6: Deploy Chaincode

### Deploy the chaincode
```bash
./scripts/deploy-chaincode.sh
```

### Verify chaincode deployment
```bash
docker exec cli peer lifecycle chaincode querycommitted --channelID cosmicforge --name patient-records
```

## Step 7: Set Up Identity Management

### Enroll admin
```bash
node scripts/enroll-admin.js
```

### Register users
```bash
# Register a doctor
node scripts/register-user.js doctor1 doctor org1.medical

# Register a patient
node scripts/register-user.js patient1 patient org1.patients
```

## Step 8: Start the API Server

### Install API dependencies
```bash
cd api
npm install
```

### Start the API server
```bash
# Start in background with PM2
npm install -g pm2
pm2 start src/app.js --name cosmicforge-api

# Monitor the API
pm2 logs cosmicforge-api
```

## Step 9: Configure Networking

### Verify port exposure
1. Go to RunPod dashboard → Your pod → "Ports"
2. Ensure port 3000 is exposed and mapped to 3000
3. Note the public URL (e.g., https://xxxxxx-3000.proxy.runpod.net)

### Test API connectivity
```bash
# From another terminal
curl https://xxxxxx-3000.proxy.runpod.net/api/health
```

## Step 10: Test the Deployment

### Run the test script
```bash
# Update API_URL in test script
sed -i 's|http://localhost:3000/api|https://xxxxxx-3000.proxy.runpod.net/api|g' test-api.js

# Run tests
node test-api.js
```

### Monitor logs
```bash
# API logs
pm2 logs cosmicforge-api

# Blockchain logs
docker logs peer0.org1.example.com
```

## Step 11: Set Up Monitoring (Optional)

### Deploy monitoring stack
```bash
cd monitoring
docker-compose up -d
```

### Access Grafana
1. Expose port 3000 in RunPod dashboard
2. Access via the provided URL
3. Default credentials: admin/admin

## Troubleshooting

### Network deployment issues
- Check Docker logs: `docker logs orderer.example.com`
- Verify Docker is running: `docker ps`

### API connection issues
- Check environment variables: `env | grep CONNECTION`
- Verify wallet contents: `ls -la wallet/`

### Performance issues
- Consider upgrading your RunPod instance if resources are insufficient
- Monitor resource usage: `docker stats`

## Maintenance

### Backup wallet
```bash
./scripts/backup-wallet.sh
```

### Update deployment
```bash
git pull
npm install
pm2 restart cosmicforge-api
```
