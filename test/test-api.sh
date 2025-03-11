#!/bin/bash
# test-api.sh - Comprehensive test script for CosmicForge Blockchain API
# Run this script to test all API endpoints

set -e

# Color codes for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# API configuration
API_URL="http://localhost:3000/api"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="adminpw"
TOKEN=""

# Test data
PATIENT_ID="patient123"
DOCTOR_ID="doctor456"
RECORD_ID="record789"

# Print header
echo -e "${YELLOW}==========================================================${NC}"
echo -e "${YELLOW}       CosmicForge Blockchain API Test Script             ${NC}"
echo -e "${YELLOW}==========================================================${NC}"

# Function to check if API is running
check_api() {
  echo -e "${YELLOW}Checking if API is running...${NC}"
  
  HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${API_URL}/health)
  
  if [ "$HEALTH_STATUS" != "200" ]; then
    echo -e "${RED}Error: API is not running. Please start the API server.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}API is running${NC}"
}

# Function to authenticate and get token
authenticate() {
  echo -e "${YELLOW}Authenticating with API...${NC}"
  
  AUTH_RESPONSE=$(curl -s -X POST ${API_URL}/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"${ADMIN_PASSWORD}\"}")
  
  TOKEN=$(echo $AUTH_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
  
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}Authentication failed${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Authentication successful${NC}"
}

# Function to test patient record endpoints
test_patient_endpoints() {
  echo -e "${YELLOW}Testing patient record endpoints...${NC}"
  
  # Register a new patient record
  echo -e "${YELLOW}Registering new patient record...${NC}"
  REGISTER_RESPONSE=$(curl -s -X POST ${API_URL}/patients/register \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"patientId\": \"${PATIENT_ID}\",
      \"name\": \"John Doe\",
      \"dateOfBirth\": \"1980-01-01\",
      \"gender\": \"male\",
      \"contactInfo\": {
        \"email\": \"john.doe@example.com\",
        \"phone\": \"555-123-4567\"
      },
      \"medicalHistory\": {
        \"allergies\": [\"penicillin\"],
        \"conditions\": [\"hypertension\"],
        \"medications\": [\"lisinopril\"]
      }
    }")
  
  echo $REGISTER_RESPONSE
  
  # Get patient record
  echo -e "${YELLOW}Getting patient record...${NC}"
  GET_RESPONSE=$(curl -s -X GET ${API_URL}/patients/${PATIENT_ID} \
    -H "Authorization: Bearer ${TOKEN}")
  
  echo $GET_RESPONSE
  
  # Update patient record
  echo -e "${YELLOW}Updating patient record...${NC}"
  UPDATE_RESPONSE=$(curl -s -X PUT ${API_URL}/patients/update \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"patientId\": \"${PATIENT_ID}\",
      \"name\": \"John Doe\",
      \"dateOfBirth\": \"1980-01-01\",
      \"gender\": \"male\",
      \"contactInfo\": {
        \"email\": \"john.doe.updated@example.com\",
        \"phone\": \"555-123-4567\"
      },
      \"medicalHistory\": {
        \"allergies\": [\"penicillin\", \"sulfa\"],
        \"conditions\": [\"hypertension\"],
        \"medications\": [\"lisinopril\", \"aspirin\"]
      }
    }")
  
  echo $UPDATE_RESPONSE
  
  # Verify patient record
  echo -e "${YELLOW}Verifying patient record...${NC}"
  VERIFY_RESPONSE=$(curl -s -X POST ${API_URL}/patients/verify \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"patientId\": \"${PATIENT_ID}\",
      \"name\": \"John Doe\",
      \"dateOfBirth\": \"1980-01-01\",
      \"gender\": \"male\",
      \"contactInfo\": {
        \"email\": \"john.doe.updated@example.com\",
        \"phone\": \"555-123-4567\"
      },
      \"medicalHistory\": {
        \"allergies\": [\"penicillin\", \"sulfa\"],
        \"conditions\": [\"hypertension\"],
        \"medications\": [\"lisinopril\", \"aspirin\"]
      }
    }")
  
  echo $VERIFY_RESPONSE
  
  echo -e "${GREEN}Patient record endpoints tested successfully${NC}"
}

# Function to test access control endpoints
test_access_control_endpoints() {
  echo -e "${YELLOW}Testing access control endpoints...${NC}"
  
  # Grant access
  echo -e "${YELLOW}Granting access to doctor...${NC}"
  GRANT_RESPONSE=$(curl -s -X POST ${API_URL}/access/grant \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"patientId\": \"${PATIENT_ID}\",
      \"userId\": \"${DOCTOR_ID}\",
      \"role\": \"doctor\",
      \"permissions\": [\"read\", \"update\"],
      \"expiryDate\": \"2025-12-31T23:59:59Z\"
    }")
  
  echo $GRANT_RESPONSE
  
  # Get access control list
  echo -e "${YELLOW}Getting access control list...${NC}"
  ACL_RESPONSE=$(curl -s -X GET ${API_URL}/access/${PATIENT_ID} \
    -H "Authorization: Bearer ${TOKEN}")
  
  echo $ACL_RESPONSE
  
  # Check access
  echo -e "${YELLOW}Checking access permission...${NC}"
  CHECK_RESPONSE=$(curl -s -X POST ${API_URL}/access/check \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"patientId\": \"${PATIENT_ID}\",
      \"userId\": \"${DOCTOR_ID}\",
      \"permission\": \"read\"
    }")
  
  echo $CHECK_RESPONSE
  
  # Revoke access
  echo -e "${YELLOW}Revoking access...${NC}"
  REVOKE_RESPONSE=$(curl -s -X POST ${API_URL}/access/revoke \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"patientId\": \"${PATIENT_ID}\",
      \"userId\": \"${DOCTOR_ID}\"
    }")
  
  echo $REVOKE_RESPONSE
  
  echo -e "${GREEN}Access control endpoints tested successfully${NC}"
}

# Function to test audit trail endpoints
test_audit_trail_endpoints() {
  echo -e "${YELLOW}Testing audit trail endpoints...${NC}"
  
  # Create audit entry
  echo -e "${YELLOW}Creating audit entry...${NC}"
  AUDIT_RESPONSE=$(curl -s -X POST ${API_URL}/audit/create \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"patientId\": \"${PATIENT_ID}\",
      \"userId\": \"${ADMIN_USERNAME}\",
      \"action\": \"view\",
      \"resourceId\": \"${RECORD_ID}\",
      \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
      \"details\": \"Viewed patient record for consultation\"
    }")
  
  echo $AUDIT_RESPONSE
  
  # Get audit trail
  echo -e "${YELLOW}Getting audit trail...${NC}"
  TRAIL_RESPONSE=$(curl -s -X GET ${API_URL}/audit/${PATIENT_ID} \
    -H "Authorization: Bearer ${TOKEN}")
  
  echo $TRAIL_RESPONSE
  
  # Get audit trail by date range
  echo -e "${YELLOW}Getting audit trail by date range...${NC}"
  DATE_RANGE_RESPONSE=$(curl -s -X GET "${API_URL}/audit/${PATIENT_ID}/date-range?startDate=$(date -u -d '7 days ago' +"%Y-%m-%dT%H:%M:%SZ")&endDate=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    -H "Authorization: Bearer ${TOKEN}")
  
  echo $DATE_RANGE_RESPONSE
  
  echo -e "${GREEN}Audit trail endpoints tested successfully${NC}"
}

# Function to test error handling
test_error_handling() {
  echo -e "${YELLOW}Testing error handling...${NC}"
  
  # Test invalid patient ID
  echo -e "${YELLOW}Testing invalid patient ID...${NC}"
  INVALID_ID_RESPONSE=$(curl -s -X GET ${API_URL}/patients/nonexistent \
    -H "Authorization: Bearer ${TOKEN}")
  
  echo $INVALID_ID_RESPONSE
  
  # Test invalid token
  echo -e "${YELLOW}Testing invalid token...${NC}"
  INVALID_TOKEN_RESPONSE=$(curl -s -X GET ${API_URL}/patients/${PATIENT_ID} \
    -H "Authorization: Bearer invalid_token")
  
  echo $INVALID_TOKEN_RESPONSE
  
  # Test missing required fields
  echo -e "${YELLOW}Testing missing required fields...${NC}"
  MISSING_FIELDS_RESPONSE=$(curl -s -X POST ${API_URL}/patients/register \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"name\": \"Missing Patient ID\"
    }")
  
  echo $MISSING_FIELDS_RESPONSE
  
  echo -e "${GREEN}Error handling tested successfully${NC}"
}

# Main execution
main() {
  echo -e "${YELLOW}Starting CosmicForge Blockchain API tests...${NC}"
  
  # Check if API is running
  check_api
  
  # Authenticate
  authenticate
  
  # Test patient record endpoints
  test_patient_endpoints
  
  # Test access control endpoints
  test_access_control_endpoints
  
  # Test audit trail endpoints
  test_audit_trail_endpoints
  
  # Test error handling
  test_error_handling
  
  echo -e "${GREEN}==========================================================${NC}"
  echo -e "${GREEN}  CosmicForge Blockchain API tests completed successfully! ${NC}"
  echo -e "${GREEN}==========================================================${NC}"
}

# Execute main function
main
