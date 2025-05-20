import mongoose from 'mongoose';
import { MatchModel } from './Match';

describe('Match Model', () => {
  let userId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Use in-memory MongoDB or test DB in real setup
    userId = new mongoose.Types.ObjectId();
  });

  it('should not allow less or more than 2 teams', async () => {
    const match = new MatchModel({
      playerSetup: '1v1',
      teams: [{ name: 'A', color: 'red', players: [{ name: 'Player 1', playerId: null }], setsWon: 0 }],
      numGoalsToWin: 5,
      numSetsToWin: 2,
      twoAhead: false,
      name: 'Test Match',
      draw: false,
      timeoutsPerSet: 2,
      lastSetTwoGoalRule: false,
      createdBy: userId,
    });
    try {
      await match.validate();
      throw new Error('Validation should have failed');
    } catch (err: any) {
      expect(err.errors['teams']).toBeDefined();
    }
  });

  it('should require valid enum values', async () => {
    const match = new MatchModel({
      playerSetup: 'invalid',
      teams: [
        { name: 'A', color: 'red', players: [{ name: 'Player 1', playerId: null }], setsWon: 0 },
        { name: 'B', color: 'blue', players: [{ name: 'Player 2', playerId: 'abc123' }], setsWon: 0 },
      ],
      numGoalsToWin: 5,
      numSetsToWin: 2,
      twoAhead: false,
      name: 'Test Match',
      draw: false,
      timeoutsPerSet: 2,
      lastSetTwoGoalRule: false,
      createdBy: userId,
    });
    try {
      await match.validate();
      throw new Error('Validation should have failed');
    } catch (err: any) {
      expect(err.errors['playerSetup']).toBeDefined();
    }
  });

  it('should calculate winner virtual correctly', async () => {
    const match = new MatchModel({
      playerSetup: '1v1',
      teams: [
        { name: 'A', color: 'red', players: [{ name: 'Player 1', playerId: null }], setsWon: 2 },
        { name: 'B', color: 'blue', players: [{ name: 'Player 2', playerId: 'abc123' }], setsWon: 1 },
      ],
      numGoalsToWin: 5,
      numSetsToWin: 2,
      twoAhead: false,
      name: 'Test Match',
      draw: false,
      timeoutsPerSet: 2,
      lastSetTwoGoalRule: false,
      createdBy: userId,
      status: 'completed',
    });
    expect(match.winner).toBe(0);
  });
});
