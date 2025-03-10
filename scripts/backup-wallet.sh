#!/bin/bash
# backup-wallet.sh - Script to backup the wallet directory
# This script creates a backup of the wallet directory for the CosmicForge blockchain network

set -e

# Color codes for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
WALLET_DIR="../wallet"
BACKUP_DIR="../backups/wallet"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="wallet_backup_${TIMESTAMP}.tar.gz"

# Print header
echo -e "${YELLOW}==========================================================${NC}"
echo -e "${YELLOW}       CosmicForge Blockchain Wallet Backup               ${NC}"
echo -e "${YELLOW}==========================================================${NC}"

# Check if wallet directory exists
if [ ! -d "$WALLET_DIR" ]; then
  echo -e "${RED}Error: Wallet directory not found at $WALLET_DIR${NC}"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo -e "${YELLOW}Creating backup of wallet directory...${NC}"
tar -czf "${BACKUP_DIR}/${BACKUP_FILE}" -C "$(dirname "$WALLET_DIR")" "$(basename "$WALLET_DIR")"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create backup${NC}"
  exit 1
fi

# Verify backup
echo -e "${YELLOW}Verifying backup...${NC}"
tar -tzf "${BACKUP_DIR}/${BACKUP_FILE}" > /dev/null

if [ $? -ne 0 ]; then
  echo -e "${RED}Backup verification failed${NC}"
  exit 1
fi

# Display backup information
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
echo -e "${GREEN}Backup created successfully: ${BACKUP_DIR}/${BACKUP_FILE} (${BACKUP_SIZE})${NC}"

# List all backups
echo -e "${YELLOW}Available backups:${NC}"
ls -lh "${BACKUP_DIR}" | grep "wallet_backup_" | sort -r

# Cleanup old backups (keep last 5)
echo -e "${YELLOW}Cleaning up old backups (keeping last 5)...${NC}"
ls -t "${BACKUP_DIR}"/wallet_backup_*.tar.gz | tail -n +6 | xargs -r rm

echo -e "${GREEN}==========================================================${NC}"
echo -e "${GREEN}  CosmicForge blockchain wallet backup completed!          ${NC}"
echo -e "${GREEN}==========================================================${NC}"
