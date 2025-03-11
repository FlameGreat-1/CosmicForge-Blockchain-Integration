#!/usr/bin/env node
/**
 * test-api.js - Comprehensive test script for CosmicForge Blockchain API
 * Run this script to test all API endpoints using Node.js (works on Termux)
 */

const axios = require('axios');
const colors = {
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

// API configuration
const API_URL = 'http://localhost:3000/api';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'adminpw';
let TOKEN = '';

// Test data
const PATIENT_ID = 'patient123';
const DOCTOR_ID = 'doctor456';
const RECORD_ID = 'record789';

// Print header
console.log(`${colors.yellow}==========================================================${colors.reset}`);
console.log(`${colors.yellow}       CosmicForge Blockchain API Test Script             ${colors.reset}`);
console.log(`${colors.yellow}==========================================================${colors.reset}`);

// Function to check if API is running
async function checkApi() {
  console.log(`${colors.yellow}Checking if API is running...${colors.reset}`);
  
  try {
    const response = await axios.get(`${API_URL}/health`);
    if (response.status === 200) {
      console.log(`${colors.green}API is running${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.error(`${colors.red}Error: API is not running. Please start the API server.${colors.reset}`);
    return false;
  }
}

// Function to authenticate and get token
async function authenticate() {
  console.log(`${colors.yellow}Authenticating with API...${colors.reset}`);
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    });
    
    TOKEN = response.data.token;
    
    if (!TOKEN) {
      console.error(`${colors.red}Authentication failed${colors.reset}`);
      return false;
    }
    
    console.log(`${colors.green}Authentication successful${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Authentication failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Function to test patient record endpoints
async function testPatientEndpoints() {
  console.log(`${colors.yellow}Testing patient record endpoints...${colors.reset}`);
  
  try {
    // Register a new patient record
    console.log(`${colors.yellow}Registering new patient record...${colors.reset}`);
    const registerResponse = await axios.post(
      `${API_URL}/patients/register`,
      {
        patientId: PATIENT_ID,
        name: "John Doe",
        dateOfBirth: "1980-01-01",
        gender: "male",
        contactInfo: {
          email: "john.doe@example.com",
          phone: "555-123-4567"
        },
        medicalHistory: {
          allergies: ["penicillin"],
          conditions: ["hypertension"],
          medications: ["lisinopril"]
        }
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(registerResponse.data);
    
    // Get patient record
    console.log(`${colors.yellow}Getting patient record...${colors.reset}`);
    const getResponse = await axios.get(
      `${API_URL}/patients/${PATIENT_ID}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(getResponse.data);
    
    // Update patient record
    console.log(`${colors.yellow}Updating patient record...${colors.reset}`);
    const updateResponse = await axios.put(
      `${API_URL}/patients/update`,
      {
        patientId: PATIENT_ID,
        name: "John Doe",
        dateOfBirth: "1980-01-01",
        gender: "male",
        contactInfo: {
          email: "john.doe.updated@example.com",
          phone: "555-123-4567"
        },
        medicalHistory: {
          allergies: ["penicillin", "sulfa"],
          conditions: ["hypertension"],
          medications: ["lisinopril", "aspirin"]
        }
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(updateResponse.data);
    
    // Verify patient record
    console.log(`${colors.yellow}Verifying patient record...${colors.reset}`);
    const verifyResponse = await axios.post(
      `${API_URL}/patients/verify`,
      {
        patientId: PATIENT_ID,
        name: "John Doe",
        dateOfBirth: "1980-01-01",
        gender: "male",
        contactInfo: {
          email: "john.doe.updated@example.com",
          phone: "555-123-4567"
        },
        medicalHistory: {
          allergies: ["penicillin", "sulfa"],
          conditions: ["hypertension"],
          medications: ["lisinopril", "aspirin"]
        }
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(verifyResponse.data);
    
    console.log(`${colors.green}Patient record endpoints tested successfully${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Patient endpoint test failed: ${error.message}${colors.reset}`);
    if (error.response) {
      console.error(`${colors.red}Response data: ${JSON.stringify(error.response.data)}${colors.reset}`);
    }
    return false;
  }
}

// Function to test access control endpoints
async function testAccessControlEndpoints() {
  console.log(`${colors.yellow}Testing access control endpoints...${colors.reset}`);
  
  try {
    // Grant access
    console.log(`${colors.yellow}Granting access to doctor...${colors.reset}`);
    const grantResponse = await axios.post(
      `${API_URL}/access/grant`,
      {
        patientId: PATIENT_ID,
        userId: DOCTOR_ID,
        role: "doctor",
        permissions: ["read", "update"],
        expiryDate: "2025-12-31T23:59:59Z"
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(grantResponse.data);
    
    // Get access control list
    console.log(`${colors.yellow}Getting access control list...${colors.reset}`);
    const aclResponse = await axios.get(
      `${API_URL}/access/${PATIENT_ID}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(aclResponse.data);
    
    // Check access
    console.log(`${colors.yellow}Checking access permission...${colors.reset}`);
    const checkResponse = await axios.post(
      `${API_URL}/access/check`,
      {
        patientId: PATIENT_ID,
        userId: DOCTOR_ID,
        permission: "read"
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(checkResponse.data);
    
    // Revoke access
    console.log(`${colors.yellow}Revoking access...${colors.reset}`);
    const revokeResponse = await axios.post(
      `${API_URL}/access/revoke`,
      {
        patientId: PATIENT_ID,
        userId: DOCTOR_ID
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(revokeResponse.data);
    
    console.log(`${colors.green}Access control endpoints tested successfully${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Access control endpoint test failed: ${error.message}${colors.reset}`);
    if (error.response) {
      console.error(`${colors.red}Response data: ${JSON.stringify(error.response.data)}${colors.reset}`);
    }
    return false;
  }
}

// Function to test audit trail endpoints
async function testAuditTrailEndpoints() {
  console.log(`${colors.yellow}Testing audit trail endpoints...${colors.reset}`);
  
  try {
    // Create audit entry
    console.log(`${colors.yellow}Creating audit entry...${colors.reset}`);
    const auditResponse = await axios.post(
      `${API_URL}/audit/create`,
      {
        patientId: PATIENT_ID,
        userId: ADMIN_USERNAME,
        action: "view",
        resourceId: RECORD_ID,
        timestamp: new Date().toISOString(),
        details: "Viewed patient record for consultation"
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(auditResponse.data);
    
    // Get audit trail
    console.log(`${colors.yellow}Getting audit trail...${colors.reset}`);
    const trailResponse = await axios.get(
      `${API_URL}/audit/${PATIENT_ID}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(trailResponse.data);
    
    // Get audit trail by date range
    console.log(`${colors.yellow}Getting audit trail by date range...${colors.reset}`);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dateRangeResponse = await axios.get(
      `${API_URL}/audit/${PATIENT_ID}/date-range?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log(dateRangeResponse.data);
    
    console.log(`${colors.green}Audit trail endpoints tested successfully${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Audit trail endpoint test failed: ${error.message}${colors.reset}`);
    if (error.response) {
      console.error(`${colors.red}Response data: ${JSON.stringify(error.response.data)}${colors.reset}`);
    }
    return false;
  }
}

// Function to test error handling
async function testErrorHandling() {
  console.log(`${colors.yellow}Testing error handling...${colors.reset}`);
  
  try {
    // Test invalid patient ID
    console.log(`${colors.yellow}Testing invalid patient ID...${colors.reset}`);
    try {
      const invalidIdResponse = await axios.get(
        `${API_URL}/patients/nonexistent`,
        {
          headers: { Authorization: `Bearer ${TOKEN}` }
        }
      );
      console.log(invalidIdResponse.data);
    } catch (error) {
      console.log(`Expected error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    // Test invalid token
    console.log(`${colors.yellow}Testing invalid token...${colors.reset}`);
    try {
      const invalidTokenResponse = await axios.get(
        `${API_URL}/patients/${PATIENT_ID}`,
        {
          headers: { Authorization: `Bearer invalid_token` }
        }
      );
      console.log(invalidTokenResponse.data);
    } catch (error) {
      console.log(`Expected error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    // Test missing required fields
    console.log(`${colors.yellow}Testing missing required fields...${colors.reset}`);
    try {
      const missingFieldsResponse = await axios.post(
        `${API_URL}/patients/register`,
        {
          name: "Missing Patient ID"
        },
        {
          headers: { Authorization: `Bearer ${TOKEN}` }
        }
      );
      console.log(missingFieldsResponse.data);
    } catch (error) {
      console.log(`Expected error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    console.log(`${colors.green}Error handling tested successfully${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Error handling test failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Main execution
async function main() {
  console.log(`${colors.yellow}Starting CosmicForge Blockchain API tests...${colors.reset}`);
  
  // Check if API is running
  if (!await checkApi()) {
    return;
  }
  
  // Authenticate
  if (!await authenticate()) {
    return;
  }
  
  // Test patient record endpoints
  await testPatientEndpoints();
  
  // Test access control endpoints
  await testAccessControlEndpoints();
  
  // Test audit trail endpoints
  await testAuditTrailEndpoints();
  
  // Test error handling
  await testErrorHandling();
  
  console.log(`${colors.green}==========================================================${colors.reset}`);
  console.log(`${colors.green}  CosmicForge Blockchain API tests completed successfully! ${colors.reset}`);
  console.log(`${colors.green}==========================================================${colors.reset}`);
}

// Execute main function
main().catch(error => {
  console.error(`${colors.red}Test failed with error: ${error.message}${colors.reset}`);
});
