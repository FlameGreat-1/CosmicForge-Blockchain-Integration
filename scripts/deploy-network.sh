#!/bin/bash
# deploy-network.sh - Script to deploy the CosmicForge blockchain network
# This script sets up the Hyperledger Fabric network for the CosmicForge telemedicine platform

set -e

# Color codes for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
NETWORK_DIR="../network"
CRYPTO_CONFIG_DIR="$NETWORK_DIR/crypto-config"
CHANNEL_NAME="cosmicforge"
CHANNEL_TX_FILE="$NETWORK_DIR/channel-artifacts/${CHANNEL_NAME}.tx"
GENESIS_BLOCK_FILE="$NETWORK_DIR/channel-artifacts/genesis.block"
DOCKER_COMPOSE_FILE="$NETWORK_DIR/docker/docker-compose.yaml"

# Print header
echo -e "${YELLOW}==========================================================${NC}"
echo -e "${YELLOW}       CosmicForge Blockchain Network Deployment          ${NC}"
echo -e "${YELLOW}==========================================================${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Check if Fabric binaries are available
if ! command -v configtxgen &> /dev/null; then
  echo -e "${RED}Error: Fabric binaries not found. Please install Hyperledger Fabric binaries.${NC}"
  echo -e "${YELLOW}You can download them using: curl -sSL https://bit.ly/2ysbOFE | bash -s${NC}"
  exit 1
fi

# Function to generate crypto materials
generate_crypto_materials() {
  echo -e "${YELLOW}Generating crypto materials...${NC}"
  
  # Check if crypto-config.yaml exists
  if [ ! -f "$NETWORK_DIR/crypto-config.yaml" ]; then
    echo -e "${RED}Error: crypto-config.yaml not found at $NETWORK_DIR/crypto-config.yaml${NC}"
    exit 1
  fi
  
  # Generate crypto materials
  cryptogen generate --config="$NETWORK_DIR/crypto-config.yaml" --output="$CRYPTO_CONFIG_DIR"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to generate crypto materials${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Crypto materials generated successfully${NC}"
}

# Function to generate genesis block and channel transaction
generate_channel_artifacts() {
  echo -e "${YELLOW}Generating channel artifacts...${NC}"
  
  # Create channel artifacts directory if it doesn't exist
  mkdir -p "$NETWORK_DIR/channel-artifacts"
  
  # Check if configtx.yaml exists
  if [ ! -f "$NETWORK_DIR/configtx/configtx.yaml" ]; then
    echo -e "${RED}Error: configtx.yaml not found at $NETWORK_DIR/configtx/configtx.yaml${NC}"
    exit 1
  fi
  
  # Set FABRIC_CFG_PATH to the location of configtx.yaml
  export FABRIC_CFG_PATH="$NETWORK_DIR/configtx"
  
  # Generate genesis block
  echo -e "${YELLOW}Generating genesis block...${NC}"
  configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock "$GENESIS_BLOCK_FILE"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to generate genesis block${NC}"
    exit 1
  fi
  
  # Generate channel transaction
  echo -e "${YELLOW}Generating channel transaction...${NC}"
  configtxgen -profile TwoOrgsChannel -outputCreateChannelTx "$CHANNEL_TX_FILE" -channelID "$CHANNEL_NAME"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to generate channel transaction${NC}"
    exit 1
  fi
  
  # Generate anchor peer transactions for each org
  echo -e "${YELLOW}Generating anchor peer transactions...${NC}"
  configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate "$NETWORK_DIR/channel-artifacts/Org1MSPanchors.tx" -channelID "$CHANNEL_NAME" -asOrg Org1MSP
  configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate "$NETWORK_DIR/channel-artifacts/Org2MSPanchors.tx" -channelID "$CHANNEL_NAME" -asOrg Org2MSP
  
  echo -e "${GREEN}Channel artifacts generated successfully${NC}"
}

# Function to start the network
start_network() {
  echo -e "${YELLOW}Starting the network...${NC}"
  
  # Check if docker-compose file exists
  if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo -e "${RED}Error: docker-compose.yaml not found at $DOCKER_COMPOSE_FILE${NC}"
    exit 1
  fi
  
  # Start the network
  docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start the network${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Network started successfully${NC}"
  
  # Wait for the network to stabilize
  echo -e "${YELLOW}Waiting for the network to stabilize (30 seconds)...${NC}"
  sleep 30
}

# Function to create and join channel
create_and_join_channel() {
  echo -e "${YELLOW}Creating and joining channel...${NC}"
  
  # Create channel
  docker exec cli peer channel create -o orderer.example.com:7050 -c "$CHANNEL_NAME" -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/"$CHANNEL_NAME".tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create channel${NC}"
    exit 1
  fi
  
  # Join peer0.org1 to channel
  docker exec cli peer channel join -b "$CHANNEL_NAME".block
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to join peer0.org1 to channel${NC}"
    exit 1
  fi
  
  # Switch to org2 and join peer0.org2 to channel
  docker exec -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 -e CORE_PEER_LOCALMSPID="Org2MSP" -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt cli peer channel join -b "$CHANNEL_NAME".block
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to join peer0.org2 to channel${NC}"
    exit 1
  fi
  
  # Update anchor peers for org1
  docker exec cli peer channel update -o orderer.example.com:7050 -c "$CHANNEL_NAME" -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org1MSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
  
  # Update anchor peers for org2
  docker exec -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 -e CORE_PEER_LOCALMSPID="Org2MSP" -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt cli peer channel update -o orderer.example.com:7050 -c "$CHANNEL_NAME" -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org2MSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
  
  echo -e "${GREEN}Channel created and joined successfully${NC}"
}

# Function to verify network
verify_network() {
  echo -e "${YELLOW}Verifying network...${NC}"
  
  # Check if containers are running
  RUNNING_CONTAINERS=$(docker ps --format '{{.Names}}' | grep -E 'peer|orderer|ca')
  EXPECTED_CONTAINERS=("orderer.example.com" "peer0.org1.example.com" "peer0.org2.example.com" "ca.org1.example.com" "ca.org2.example.com")
  
  for CONTAINER in "${EXPECTED_CONTAINERS[@]}"; do
    if [[ ! $RUNNING_CONTAINERS =~ $CONTAINER ]]; then
      echo -e "${RED}Error: Container $CONTAINER is not running${NC}"
      exit 1
    fi
  done
  
  # Verify channel creation
  docker exec cli peer channel list | grep "$CHANNEL_NAME"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Channel $CHANNEL_NAME not found in peer's channel list${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Network verification successful${NC}"
}

# Main execution
main() {
  echo -e "${YELLOW}Starting CosmicForge blockchain network deployment...${NC}"
  
  # Check if network is already running
  if docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${YELLOW}Network appears to be already running. Do you want to tear it down and redeploy? (y/n)${NC}"
    read -r RESPONSE
    if [[ "$RESPONSE" =~ ^([yY][eE][sS]|[yY])$ ]]; then
      echo -e "${YELLOW}Tearing down existing network...${NC}"
      docker-compose -f "$DOCKER_COMPOSE_FILE" down --volumes --remove-orphans
      docker volume prune -f
      rm -rf "$CRYPTO_CONFIG_DIR"
      rm -rf "$NETWORK_DIR/channel-artifacts"
    else
      echo -e "${YELLOW}Deployment aborted. Existing network left intact.${NC}"
      exit 0
    fi
  fi
  
  # Generate crypto materials
  generate_crypto_materials
  
  # Generate channel artifacts
  generate_channel_artifacts
  
  # Start the network
  start_network
  
  # Create and join channel
  create_and_join_channel
  
  # Verify network
  verify_network
  
  echo -e "${GREEN}==========================================================${NC}"
  echo -e "${GREEN}  CosmicForge blockchain network deployed successfully!   ${NC}"
  echo -e "${GREEN}==========================================================${NC}"
}

# Execute main function
main
