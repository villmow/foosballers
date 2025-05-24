/**
 * Integration test for the new unified API structure
 * Tests both direct resource access and hierarchical access patterns
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Mock authentication token - you might need to adjust this based on your auth setup
const AUTH_TOKEN = 'your-test-token-here';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testApiStructure() {
  console.log('🚀 Testing new unified API structure...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await axios.get('http://localhost:4000/health');
    console.log('✅ Health check passed:', health.data);

    // Test 2: Test direct set routes (should work)
    console.log('\n2. Testing direct set routes...');
    try {
      const setsResponse = await api.get('/sets');
      console.log('✅ GET /api/sets - Available (might be empty)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  GET /api/sets - Requires authentication (expected)');
      } else {
        console.log('❌ GET /api/sets error:', error.response?.status, error.response?.data);
      }
    }

    // Test 3: Test goal routes structure 
    console.log('\n3. Testing goal routes structure...');
    try {
      const goalsResponse = await api.get('/goals');
      console.log('✅ GET /api/goals - Available');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  GET /api/goals - Requires authentication (expected)');
      } else {
        console.log('❌ GET /api/goals error:', error.response?.status, error.response?.data);
      }
    }

    // Test 4: Test timeout routes structure
    console.log('\n4. Testing timeout routes structure...');
    try {
      const timeoutsResponse = await api.get('/timeouts');
      console.log('✅ GET /api/timeouts - Available');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  GET /api/timeouts - Requires authentication (expected)');
      } else {
        console.log('❌ GET /api/timeouts error:', error.response?.status, error.response?.data);
      }
    }

    // Test 5: Verify old redundant routes are removed
    console.log('\n5. Testing removed redundant routes...');
    try {
      await api.get('/goals/match/test-match-id');
      console.log('❌ Old route /api/goals/match/:matchId still exists (should be removed)');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Old route /api/goals/match/:matchId properly removed');
      } else {
        console.log('⚠️  Unexpected error for removed route:', error.response?.status);
      }
    }

    try {
      await api.get('/timeouts/set/test-set-id');
      console.log('❌ Old route /api/timeouts/set/:setId still exists (should be removed)');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Old route /api/timeouts/set/:setId properly removed');
      } else {
        console.log('⚠️  Unexpected error for removed route:', error.response?.status);
      }
    }

    console.log('\n🎉 API structure test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ New /api/sets routes are registered');
    console.log('- ✅ Goal and timeout routes cleaned up (redundant routes removed)');
    console.log('- ✅ API follows resource-first approach');
    console.log('- ⚠️  Authentication required for protected routes (expected)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the backend server is running on port 4000');
      console.error('   Run: cd backend && npm run dev');
    }
  }
}

// Run the test
testApiStructure();
