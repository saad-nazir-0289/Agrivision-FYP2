import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import AlertRule from '../src/models/AlertRule.js';
import { DEFAULT_RULES } from '../src/services/alertRules.js';

// Disable rate limiter during automated testing
process.env.NODE_ENV = 'test'; 

// CRITICAL: Dedicated test database URI so your real main database is never touched
const TEST_DB = 'mongodb://127.0.0.1:27017/agrivision_test_rules';
const PASSWORD = 'password123';
const URL = '/api/admin/alert-rules';

const customRules = { 
  ndvi: { high: 0.3, moderate: 0.4, low: 0.5 }, 
  drop: { high: 0.2, moderate: 0.1, low: 0.05 } 
};

let server;
let baseUrl;
let adminToken;
let farmerToken;

// Helper function to handle HTTP API calls during testing
async function apiCall(method, endpoint, requestBody, token) {
  const requestOptions = {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    requestOptions.headers['Authorization'] = 'Bearer ' + token;
  }

  if (requestBody) {
    requestOptions.body = JSON.stringify(requestBody);
  }

  const response = await fetch(baseUrl + endpoint, requestOptions);
  const responseData = await response.json();

  return {
    status: response.status,
    data: responseData
  };
}

// Helper function to log in test users and retrieve authentication tokens
async function loginUser(emailAddress) {
  const loginResponse = await apiCall('POST', '/api/auth/login', {
    email: emailAddress,
    password: PASSWORD
  });
  return loginResponse.data.token;
}

// Database setup and test server initialization before running tests
before(async () => {
  // Connects strictly to the isolated test database
  await mongoose.connect(TEST_DB);
  
  // Clear only the test alert rules; drop test user collection safely
  await User.deleteMany({});
  await AlertRule.deleteMany({});
  
  await AlertRule.init(); // Ensure unique indexes are built

  // Start the Express application on a dynamic free port
  server = app.listen(0);
  const addressInfo = server.address();
  baseUrl = 'http://127.0.0.1:' + addressInfo.port;

  // Hash password for temporary test seeding
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Seed temporary test-only accounts into the test database instance
  await User.create([
    { name: 'Admin Test', email: 'admin@test.com', role: 'admin', passwordHash: passwordHash },
    { name: 'Farmer Test', email: 'farmer@test.com', role: 'farmer', passwordHash: passwordHash }
  ]);

  adminToken = await loginUser('admin@test.com');
  farmerToken = await loginUser('farmer@test.com');
});

// Clean up test database and close server after test execution
after(async () => {
  // Drops ONLY the isolated test database, preserving your real development database completely
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

describe('Alert Rules API Integration Tests', () => {

  it('should restrict rule access to administrators only (401 for guests, 403 for farmers)', async () => {
    const guestResponse = await apiCall('GET', URL);
    assert.equal(guestResponse.status, 401);

    const farmerGetResponse = await apiCall('GET', URL, undefined, farmerToken);
    assert.equal(farmerGetResponse.status, 403);

    const farmerPatchResponse = await apiCall('PATCH', URL, customRules, farmerToken);
    assert.equal(farmerPatchResponse.status, 403);
  });

  it('should return system default rules when no custom rules have been saved in the database', async () => {
    const response = await apiCall('GET', URL, undefined, adminToken);
    
    assert.equal(response.status, 200);
    assert.deepEqual(response.data.rules, DEFAULT_RULES);
    assert.deepEqual(response.data.defaults, DEFAULT_RULES);
  });

  it('should allow an admin to save custom rules and retrieve them correctly', async () => {
    const patchResponse = await apiCall('PATCH', URL, customRules, adminToken);
    assert.equal(patchResponse.status, 200);
    assert.deepEqual(patchResponse.data.rules, customRules);

    const getResponse = await apiCall('GET', URL, undefined, adminToken);
    assert.deepEqual(getResponse.data.rules, customRules);
    assert.deepEqual(getResponse.data.defaults, DEFAULT_RULES);
  });

  it('should maintain a single settings document in MongoDB regardless of multiple save updates', async () => {
    await apiCall('PATCH', URL, DEFAULT_RULES, adminToken);
    await apiCall('PATCH', URL, customRules, adminToken);
    
    const totalDocuments = await AlertRule.countDocuments();
    assert.equal(totalDocuments, 1);
  });

  it('should automatically round input threshold values to two decimal places', async () => {
    const testPayload = {
      ...customRules,
      ndvi: { high: 0.3333, moderate: 0.4, low: 0.5 }
    };

    const response = await apiCall('PATCH', URL, testPayload, adminToken);
    assert.equal(response.data.rules.ndvi.high, 0.33);
  });

  it('should reject threshold numbers in incorrect logical orders and keep prior rules unchanged', async () => {
    await apiCall('PATCH', URL, customRules, adminToken);

    const invalidPayload = {
      ndvi: { high: 0.6, moderate: 0.4, low: 0.5 },
      drop: customRules.drop
    };

    const badResponse = await apiCall('PATCH', URL, invalidPayload, adminToken);
    assert.equal(badResponse.status, 400);
    assert.match(badResponse.data.message, /NDVI levels/);

    const verifyResponse = await apiCall('GET', URL, undefined, adminToken);
    assert.deepEqual(verifyResponse.data.rules, customRules);
  });

  it('should reject missing properties or non-numeric values with a 400 status code', async () => {
    const invalidPayloads = [
      {}, 
      { ndvi: customRules.ndvi }, 
      { ...customRules, drop: { high: '0.2', moderate: 0.1, low: 0.05 } }
    ];

    for (let i = 0; i < invalidPayloads.length; i++) {
      const payload = invalidPayloads[i];
      const response = await apiCall('PATCH', URL, payload, adminToken);
      assert.equal(response.status, 400);
    }
  });

});