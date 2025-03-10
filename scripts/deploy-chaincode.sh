#!/bin/bash
# deploy-chaincode.sh - Script to deploy the CosmicForge chaincode
# This script packages, installs, approves, and commits the chaincode to the network

set -e

# Color codes for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
CHAINCODE_NAME="patient-records"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="1"
CHAINCODE_PATH="../chaincode/patient-records"
CHANNEL_NAME="cosmicforge"
CC_PACKAGE_ID=""

# Print header
echo -e "${YELLOW}==========================================================${NC}"
echo -e "${YELLOW}       CosmicForge Blockchain Chaincode Deployment        ${NC}"
echo -e "${YELLOW}==========================================================${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Check if network is running
if ! docker ps | grep -q "peer0.org1.example.com"; then
  echo -e "${RED}Error: Blockchain network is not running. Please deploy the network first.${NC}"
  exit 1
fi

# Function to package chaincode
package_chaincode() {
  echo -e "${YELLOW}Packaging chaincode...${NC}"
  
  # Check if chaincode directory exists
  if [ ! -d "$CHAINCODE_PATH" ]; then
    echo -e "${RED}Error: Chaincode directory not found at $CHAINCODE_PATH${NC}"
    exit 1
  fi
  
  # Create chaincode package
  docker exec cli peer lifecycle chaincode package "${CHAINCODE_NAME}.tar.gz" --path "/opt/gopath/src/github.com/chaincode/patient-records" --lang node --label "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to package chaincode${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Chaincode packaged successfully${NC}"
}

# Function to install chaincode on peers
install_chaincode() {
  echo -e "${YELLOW}Installing chaincode on peers...${NC}"
  
  # Install on peer0.org1
  docker exec cli peer lifecycle chaincode install "${CHAINCODE_NAME}.tar.gz"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install chaincode on peer0.org1${NC}"
    exit 1
  fi
  
  # Install on peer0.org2
  docker exec -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 -e CORE_PEER_LOCALMSPID="Org2MSP" -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt cli peer lifecycle chaincode install "${CHAINCODE_NAME}.tar.gz"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install chaincode on peer0.org2${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Chaincode installed successfully on all peers${NC}"
}

# Function to get package ID
get_package_id() {
  echo -e "${YELLOW}Getting chaincode package ID...${NC}"
  
  # Query installed chaincode and extract package ID
  CC_PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" | awk '{print $3}' | sed 's/,$//')
  
  if [ -z "$CC_PACKAGE_ID" ]; then
    echo -e "${RED}Failed to get chaincode package ID${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Chaincode package ID: $CC_PACKAGE_ID${NC}"
}

# Function to approve chaincode definition
approve_chaincode() {
  echo -e "${YELLOW}Approving chaincode definition...${NC}"
  
  # Approve for org1
  docker exec cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" --package-id "$CC_PACKAGE_ID" --sequence "$CHAINCODE_SEQUENCE" --init-required
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to approve chaincode definition for org1${NC}"
    exit 1
  fi
  
  # Approve for org2
  docker exec -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 -e CORE_PEER_LOCALMSPID="Org2MSP" -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" --package-id "$CC_PACKAGE_ID" --sequence "$CHAINCODE_SEQUENCE" --init-required
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to approve chaincode definition for org2${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Chaincode definition approved by all organizations${NC}"
}

# Function to check commit readiness
check_commit_readiness() {
  echo -e "${YELLOW}Checking commit readiness...${NC}"
  
  # Check commit readiness
  docker exec cli peer lifecycle chaincode checkcommitreadiness --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" --sequence "$CHAINCODE_SEQUENCE" --init-required --output json
  
  # Extract approval status
  ORG1_APPROVED=$(docker exec cli peer lifecycle chaincode checkcommitreadiness --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" --sequence "$CHAINCODE_SEQUENCE" --init-required --output json | jq -r '.approvals.Org1MSP')
  ORG2_APPROVED=$(docker exec cli peer lifecycle chaincode checkcommitreadiness --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" --sequence "$CHAINCODE_SEQUENCE" --init-required --output json | jq -r '.approvals.Org2MSP')
  
  if [ "$ORG1_APPROVED" != "true" ] || [ "$ORG2_APPROVED" != "true" ]; then
    echo -e "${RED}Chaincode not ready to be committed. Org1MSP: $ORG1_APPROVED, Org2MSP: $ORG2_APPROVED${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Chaincode ready to be committed${NC}"
}

# Function to commit chaincode definition
commit_chaincode() {
  echo -e "${YELLOW}Committing chaincode definition...${NC}"
  
  # Commit chaincode definition
  docker exec cli peer lifecycle chaincode commit -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" --sequence "$CHAINCODE_SEQUENCE" --init-required --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses peer0.org2.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to commit chaincode definition${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Chaincode definition committed successfully${NC}"
}

# Function to initialize chaincode
initialize_chaincode() {
  echo -e "${YELLOW}Initializing chaincode...${NC}"
  
  # Initialize chaincode
  docker exec cli peer chaincode invoke -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C "$CHANNEL_NAME" -n "$CHAINCODE_NAME" --isInit -c '{"function":"initLedger","Args":[]}' --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses peer0.org2.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to initialize chaincode${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Chaincode initialized successfully${NC}"
}

# Function to verify chaincode
verify_chaincode() {
  echo -e "${YELLOW}Verifying chaincode installation...${NC}"
  
  # Query committed chaincode
  docker exec cli peer lifecycle chaincode querycommitted --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to verify chaincode installation${NC}"
    exit 1
  fi
  
  # Test chaincode with a query
  echo -e "${YELLOW}Testing chaincode with a query...${NC}"
  sleep 5 # Give some time for chaincode to start
  
  docker exec cli peer chaincode query -C "$CHANNEL_NAME" -n "$CHAINCODE_NAME" -c '{"Args":["getVersion"]}'
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to query chaincode${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Chaincode verified successfully${NC}"
}

# Main execution
main() {
  echo -e "${YELLOW}Starting CosmicForge chaincode deployment...${NC}"
  
  # Package chaincode
  package_chaincode
  
  # Install chaincode on peers
  install_chaincode
  
  # Get package ID
  get_package_id
  
  # Approve chaincode definition
  approve_chaincode
  
  # Check commit readiness
  check_commit_readiness
  
  # Commit chaincode definition
  commit_chaincode
  
  # Initialize chaincode
  initialize_chaincode
  
  # Verify chaincode
  verify_chaincode
  
  echo -e "${GREEN}==========================================================${NC}"
  echo -e "${GREEN}  CosmicForge chaincode deployed successfully!            ${NC}"
  echo -e "${GREEN}==========================================================${NC}"
}

# Execute main function
main
