const mongoose = require('mongoose');
const request = require('supertest');
const app = require('./app');

// Simple integration test to verify our Set/Match API endpoints work together
describe('Set/Match Integration Test', () => {
  let matchId;
  let setId;

  beforeAll(async () => {
    // Connect to test database
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foosball_test';
    await mongoose.connect(MONGODB_URI);
  });

  afterAll(async () => {
    // Clean up
    if (matchId) {
      await mongoose.connection.collection('matches').deleteOne({ _id: mongoose.Types.ObjectId(matchId) });
    }
    if (setId) {
      await mongoose.connection.collection('sets').deleteOne({ _id: mongoose.Types.ObjectId(setId) });
    }
    await mongoose.connection.close();
  });

  test('should create match, start it, and manage sets', async () => {
    // Create a match
    const matchData = {
      teams: [
        { name: 'Team A', players: ['Player 1', 'Player 2'] },
        { name: 'Team B', players: ['Player 3', 'Player 4'] }
      ],
      configuration: {
        pointsToWin: 10,
        numSetsToWin: 3,
        timeoutDuration: 30000,
        timeoutsPerSet: 1,
        twoAheadToWin: false
      }
    };

    const createRes = await request(app)
      .post('/api/matches')
      .send(matchData);
    
    expect(createRes.status).toBe(201);
    matchId = createRes.body._id;

    // Start the match
    const startRes = await request(app)
      .post(`/api/matches/${matchId}/start`);
    
    expect(startRes.status).toBe(200);
    expect(startRes.body.match.status).toBe('inProgress');
    expect(startRes.body.set).toBeDefined();
    setId = startRes.body.set._id;

    // Get current set
    const currentSetRes = await request(app)
      .get(`/api/matches/${matchId}/current-set`);
    
    expect(currentSetRes.status).toBe(200);
    expect(currentSetRes.body._id).toBe(setId);

    // Get all sets for match
    const allSetsRes = await request(app)
      .get(`/api/matches/${matchId}/sets/all`);
    
    expect(allSetsRes.status).toBe(200);
    expect(allSetsRes.body).toHaveLength(1);
    expect(allSetsRes.body[0]._id).toBe(setId);
  });
});
