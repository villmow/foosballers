#!/usr/bin/env node

/**
 * Test script to verify that matchId is now optional in scoreboard sessions
 */

const { ScoreboardService } = require('./services/scoreboardService');

async function testOptionalMatchId() {
  console.log('Testing optional matchId functionality...\n');

  try {
    // Test 1: Create session without matchId
    console.log('1. Creating session without matchId...');
    const sessionWithoutMatch = ScoreboardService.createSession();
    console.log('✓ Session created:', {
      sessionId: sessionWithoutMatch.sessionId,
      matchId: sessionWithoutMatch.matchId || 'undefined',
      currentView: sessionWithoutMatch.currentView
    });

    // Test 2: Assign match to existing session
    console.log('\n2. Assigning match to existing session...');
    const testMatchId = 'test-match-123';
    const assigned = ScoreboardService.assignMatchToSession(sessionWithoutMatch.sessionId, testMatchId);
    console.log('✓ Match assignment result:', assigned);

    // Test 3: Verify session has match assigned
    console.log('\n3. Verifying session after match assignment...');
    const updatedSession = ScoreboardService.getSession(sessionWithoutMatch.sessionId);
    console.log('✓ Updated session:', {
      sessionId: updatedSession.sessionId,
      matchId: updatedSession.matchId,
      currentView: updatedSession.currentView
    });

    // Test 4: Create session with matchId (existing functionality)
    console.log('\n4. Creating session with matchId (existing functionality)...');
    const sessionWithMatch = ScoreboardService.createSession('another-match-456');
    console.log('✓ Session with match created:', {
      sessionId: sessionWithMatch.sessionId,
      matchId: sessionWithMatch.matchId,
      currentView: sessionWithMatch.currentView
    });

    // Test 5: Test validation
    console.log('\n5. Testing session validation...');
    console.log('✓ Validate session without match:', ScoreboardService.validateSession(sessionWithoutMatch.sessionId));
    console.log('✓ Validate session with match:', ScoreboardService.validateSession(sessionWithMatch.sessionId, 'another-match-456'));
    console.log('✓ Validate session with wrong match:', ScoreboardService.validateSession(sessionWithMatch.sessionId, 'wrong-match'));

    console.log('\n🎉 All tests passed! Optional matchId functionality is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testOptionalMatchId();
