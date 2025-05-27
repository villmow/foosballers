import { Request, Response } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GoalModel } from '../models/Goal';
import { MatchModel } from '../models/Match';
import { SetModel } from '../models/Set';
import { TimeoutModel } from '../models/Timeout';
import { createGoal, unvoidGoal, voidGoal } from './goalController';
import { completeSet } from './setController';
import { createTimeout, voidTimeout } from './timeoutController';

let mongoServer: MongoMemoryServer;

// Mock the response object
const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

// Helper function to create test match and set
const createTestMatchAndSet = async () => {
  const match = new MatchModel({
    teams: [
      { 
        name: 'Team 1',
        color: 'red',
        players: [
          { name: 'Player 1', playerId: null },
          { name: 'Player 2', playerId: null }
        ],
        setsWon: 0
      },
      { 
        name: 'Team 2',
        color: 'blue',
        players: [
          { name: 'Player 3', playerId: null },
          { name: 'Player 4', playerId: null }
        ],
        setsWon: 0
      }
    ],
    status: 'inProgress',
    numGoalsToWin: 5,
    numSetsToWin: 3,
    twoAhead: false,
    playerSetup: '2v2',
    timeoutsPerSet: 2,
    createdBy: new mongoose.Types.ObjectId()
  });
  await match.save();

  const set = new SetModel({
    matchId: match._id,
    setNumber: 1,
    status: 'inProgress',
    scores: [0, 0],
    timeoutsUsed: [0, 0],
    goals: [],
    timeouts: []
  });
  await set.save();

  // Update match to include this set
  match.sets.push(set._id as any);
  await match.save();

  return { match, set };
};

describe('Goal Controller Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await MatchModel.deleteMany({});
    await SetModel.deleteMany({});
    await GoalModel.deleteMany({});
    await TimeoutModel.deleteMany({});
  });

  describe('Basic Goal Operations', () => {
    it('should create goal and return updated progression data', async () => {
      // Create test data
      const { match, set } = await createTestMatchAndSet();

      // Create request
      const req: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res = mockResponse();

      // Call the controller
      await createGoal(req as Request, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.goal).toBeDefined();
      expect(responseCall.set).toBeDefined();
      expect(responseCall.match).toBeDefined();
      expect(responseCall.progression).toBeDefined();

      // Verify the goal was created
      expect(responseCall.goal.teamIndex).toBe(0);
      expect(responseCall.goal.scoringRow).toBe('3-bar');

      // Verify the set was updated
      expect(responseCall.set.scores[0]).toBe(1);
      expect(responseCall.set.scores[1]).toBe(0);
      expect(responseCall.set.goals).toHaveLength(1);

      // Verify progression info
      expect(responseCall.progression.setCompleted).toBe(false);
      expect(responseCall.progression.matchCompleted).toBe(false);
    });

    it('should handle multiple goals and score calculation', async () => {
      // Create test data
      const { match, set } = await createTestMatchAndSet();

      // Create 3 goals for team 0 and 2 goals for team 1
      for (let i = 0; i < 3; i++) {
        const req: Partial<Request> = {
          body: {
            matchId: (match._id as any).toString(),
            setId: (set._id as any).toString(),
            teamIndex: 0,
            timestamp: new Date(Date.now() + i * 1000),
            scoringRow: '3-bar'
          }
        };
        await createGoal(req as Request, mockResponse());
      }

      for (let i = 0; i < 2; i++) {
        const req: Partial<Request> = {
          body: {
            matchId: (match._id as any).toString(),
            setId: (set._id as any).toString(),
            teamIndex: 1,
            timestamp: new Date(Date.now() + (i + 3) * 1000),
            scoringRow: '5-bar'
          }
        };
        const res = mockResponse();
        await createGoal(req as Request, res);
        
        if (i === 1) { // Check final scores on last goal
          const responseCall = (res.json as jest.Mock).mock.calls[0][0];
          expect(responseCall.set.scores).toEqual([3, 2]);
          expect(responseCall.set.goals).toHaveLength(5);
        }
      }
    });
  });

  describe('Set Completion and Match Progression', () => {
    it('should handle set completion when winning score is reached', async () => {
      // Create test data
      const { match, set } = await createTestMatchAndSet();

      // Create 4 existing goals for team 0 to set up the 4-0 score
      const existingGoals = [];
      for (let i = 0; i < 4; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() - (4 - i) * 1000), // Earlier timestamps
          scoringRow: '3-bar',
          voided: false
        });
        await goal.save();
        existingGoals.push(goal._id);
      }

      // Update set to include existing goals and scores
      set.goals = existingGoals as any[];
      set.scores = [4, 0];
      await set.save();

      // Create the winning goal
      const req: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res = mockResponse();

      // Call the controller
      await createGoal(req as Request, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Verify the set was completed
      expect(responseCall.set.status).toBe('completed');
      expect(responseCall.set.winner).toBe(0);
      expect(responseCall.set.scores[0]).toBe(5);

      // Verify match was updated
      expect(responseCall.match.teams[0].setsWon).toBe(1);

      // Verify progression info
      expect(responseCall.progression.setCompleted).toBe(true);
      expect(responseCall.progression.newSetCreated).toBe(true);
      expect(responseCall.progression.matchCompleted).toBe(false);
    });

    it('should handle match completion when final set is won', async () => {
      // Create test data with match needing 1 more set to win
      const { match, set } = await createTestMatchAndSet();
      
      // Create 2 completed sets for team 0 (needs 3 to win)
      const completedSet1 = new SetModel({
        matchId: match._id,
        setNumber: 2,
        status: 'completed',
        scores: [5, 2],
        timeoutsUsed: [0, 0],
        goals: [],
        timeouts: [],
        winner: 0,
        endTime: new Date(Date.now() - 60000)
      });
      await completedSet1.save();

      const completedSet2 = new SetModel({
        matchId: match._id,
        setNumber: 3,
        status: 'completed',
        scores: [5, 1],
        timeoutsUsed: [0, 0],
        goals: [],
        timeouts: [],
        winner: 0,
        endTime: new Date(Date.now() - 30000)
      });
      await completedSet2.save();

      // Update match to include these sets and current setsWon
      match.sets.push(completedSet1._id as any, completedSet2._id as any);
      match.teams[0].setsWon = 2;
      match.currentSet = set._id as any;
      await match.save();

      // Create 4 existing goals for team 0 to set up the 4-0 score  
      const existingGoals = [];
      for (let i = 0; i < 4; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() - (4 - i) * 1000),
          scoringRow: '3-bar',
          voided: false
        });
        await goal.save();
        existingGoals.push(goal._id);
      }

      // Update set to include existing goals and scores
      set.goals = existingGoals as any[];
      set.scores = [4, 0];
      await set.save();

      // Create the winning goal that will complete the match
      const req: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res = mockResponse();

      // Call the controller
      await createGoal(req as Request, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Verify the set was completed
      expect(responseCall.set.status).toBe('completed');
      expect(responseCall.set.winner).toBe(0);

      // Verify match was completed
      expect(responseCall.match.status).toBe('completed');
      expect(responseCall.match.teams[0].setsWon).toBe(3);

      // Verify progression info
      expect(responseCall.progression.setCompleted).toBe(true);
      expect(responseCall.progression.matchCompleted).toBe(true);
      expect(responseCall.progression.newSetCreated).toBe(false); // No new set when match is complete
    });

    it('should handle two-ahead rule when enabled', async () => {
      // Create test data with two-ahead rule enabled
      const { match, set } = await createTestMatchAndSet();
      
      // Enable two-ahead rule
      match.twoAhead = true;
      await match.save();

      // Create goals to reach 5-4 score
      // Since this is NOT a deciding set (0-0, not 2-2), twoAhead should not apply
      const goals = [];
      for (let i = 0; i < 5; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() - (9 - i) * 1000),
          scoringRow: '3-bar',
          voided: false
        });
        await goal.save();
        goals.push(goal._id);
      }
      for (let i = 0; i < 4; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 1,
          timestamp: new Date(Date.now() - (4 - i) * 1000),
          scoringRow: '5-bar',
          voided: false
        });
        await goal.save();
        goals.push(goal._id);
      }

      // Update set to reflect 5-4 score
      set.goals = goals as any[];
      set.scores = [5, 4];
      await set.save();

      // Score another goal for team 0 
      // This should complete the set immediately (5-4 becomes 6-4)
      // because twoAhead rule should NOT apply in non-deciding sets
      const req: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res = mockResponse();
      await createGoal(req as Request, res);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // The set should complete because twoAhead rule doesn't apply in non-deciding sets
      expect(responseCall.set.status).toBe('completed');
      expect(responseCall.set.winner).toBe(0);
      expect(responseCall.set.scores[0]).toBe(6);
      expect(responseCall.progression.setCompleted).toBe(true);
    });

    it('should enforce two-ahead rule in deciding set', async () => {
      // Create test data with two-ahead rule enabled
      const { match, set } = await createTestMatchAndSet();
      
      // Enable two-ahead rule and set up a deciding set scenario (2-2 in best of 5)
      match.twoAhead = true;
      match.teams[0].setsWon = 2;
      match.teams[1].setsWon = 2;
      await match.save();

      // Create goals to reach 4-4 score
      const goals = [];
      for (let i = 0; i < 4; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() - (8 - i) * 1000),
          scoringRow: '3-bar',
          voided: false
        });
        await goal.save();
        goals.push(goal._id);
      }
      for (let i = 0; i < 4; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 1,
          timestamp: new Date(Date.now() - (4 - i) * 1000),
          scoringRow: '5-bar',
          voided: false
        });
        await goal.save();
        goals.push(goal._id);
      }

      // Update set to reflect 4-4 score
      set.goals = goals as any[];
      set.scores = [4, 4];
      await set.save();

      // Score one goal for team 0 (4-4 becomes 5-4)
      // This should NOT complete the set because we need 2 ahead in deciding set
      const req1: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res1 = mockResponse();
      await createGoal(req1 as Request, res1);

      const responseCall1 = (res1.json as jest.Mock).mock.calls[0][0];

      // The set should NOT complete yet - 5-4 is only 1 ahead in deciding set
      expect(responseCall1.set.status).toBe('inProgress');
      expect(responseCall1.set.scores).toEqual([5, 4]);
      expect(responseCall1.progression.setCompleted).toBe(false);

      // Score another goal for team 0 (5-4 becomes 6-4)
      // This should complete the set because 6-4 is 2 ahead
      const req2: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res2 = mockResponse();
      await createGoal(req2 as Request, res2);

      const responseCall2 = (res2.json as jest.Mock).mock.calls[0][0];

      // Now the set should complete - 6-4 is 2 ahead in deciding set
      expect(responseCall2.set.status).toBe('completed');
      expect(responseCall2.set.winner).toBe(0);
      expect(responseCall2.set.scores).toEqual([6, 4]);
      expect(responseCall2.progression.setCompleted).toBe(true);
    });

  });

  describe('Goal Voiding and Unvoiding', () => {
    it('should void a goal and update scores correctly', async () => {
      // Create test data with some goals
      const { match, set } = await createTestMatchAndSet();

      // Create 3 goals
      const goals = [];
      for (let i = 0; i < 3; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: i % 2, // Alternate teams
          timestamp: new Date(Date.now() + i * 1000),
          scoringRow: '3-bar',
          voided: false
        });
        await goal.save();
        goals.push(goal._id);
      }

      // Update set to include goals and scores
      set.goals = goals as any[];
      set.scores = [2, 1]; // Team 0: 2, Team 1: 1
      await set.save();

      // Void the second goal (team 1's goal)
      const req: Partial<Request> = {
        params: { goalId: (goals[1] as any).toString() }
      };

      const res = mockResponse();
      await voidGoal(req as Request, res);

      // Verify response - voiding returns 200 implicitly
      expect(res.json).toHaveBeenCalled();
      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Verify the goal was voided
      expect(responseCall.goal.voided).toBe(true);

      // Verify scores were updated (team 1 should lose 1 point)
      expect(responseCall.set.scores).toEqual([2, 0]);

      // Verify progression info
      expect(responseCall.progression).toBeDefined();
    });

    it('should unvoid a goal and update scores correctly', async () => {
      // Create test data with a voided goal
      const { match, set } = await createTestMatchAndSet();

      // Create 2 goals, one voided
      const goal1 = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(Date.now()),
        scoringRow: '3-bar',
        voided: false
      });
      await goal1.save();

      const goal2 = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 1,
        timestamp: new Date(Date.now() + 1000),
        scoringRow: '5-bar',
        voided: true // Already voided
      });
      await goal2.save();

      // Update set to include goals and current scores (only counting non-voided)
      set.goals = [goal1._id, goal2._id] as any[];
      set.scores = [1, 0]; // Only goal1 counted
      await set.save();

      // Unvoid the second goal
      const req: Partial<Request> = {
        params: { goalId: (goal2._id as any).toString() }
      };

      const res = mockResponse();
      await unvoidGoal(req as Request, res);

      // Verify response - unvoiding returns 200 implicitly
      expect(res.json).toHaveBeenCalled();
      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Verify the goal was unvoided
      expect(responseCall.goal.voided).toBe(false);

      // Verify scores were updated (team 1 should gain 1 point)
      expect(responseCall.set.scores).toEqual([1, 1]);
    });

    it('should handle set completion reversal when voiding winning goal', async () => {
      // Create test data with a completed set
      const { match, set } = await createTestMatchAndSet();

      // Create 5 goals for team 0 (winning score)
      const goals = [];
      for (let i = 0; i < 5; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() + i * 1000),
          scoringRow: '3-bar',
          voided: false
        });
        await goal.save();
        goals.push(goal._id);
      }

      // Update set to be completed
      set.goals = goals as any[];
      set.scores = [5, 0];
      set.status = 'completed';
      set.winner = 0;
      await set.save();

      // Update match to reflect set win
      match.teams[0].setsWon = 1;
      await match.save();

      // Void the last goal (winning goal)
      const req: Partial<Request> = {
        params: { goalId: (goals[4] as any).toString() }
      };

      const res = mockResponse();
      await voidGoal(req as Request, res);

      // Verify response - voiding returns 200 implicitly
      expect(res.json).toHaveBeenCalled();
      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Verify the set completion was reversed
      expect(responseCall.set.status).toBe('inProgress');
      expect(responseCall.set.winner).toBeUndefined();
      expect(responseCall.set.scores).toEqual([4, 0]);

      // Verify match was updated
      expect(responseCall.match.teams[0].setsWon).toBe(0);
    });
  });

  describe('Timeout Integration', () => {
    it('should create timeout and update set progression', async () => {
      // Create test data
      const { match, set } = await createTestMatchAndSet();

      // Create timeout request
      const req: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date()
        }
      };

      const res = mockResponse();
      await createTimeout(req as Request, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Verify timeout was created
      expect(responseCall.timeout.teamIndex).toBe(0);

      // Verify set was updated
      expect(responseCall.set.timeoutsUsed[0]).toBe(1);
      expect(responseCall.set.timeoutsUsed[1]).toBe(0);
      expect(responseCall.set.timeouts).toHaveLength(1);
    });

    it('should handle automatic set start when match begins', async () => {
      // Create match with a set that's not started yet
      const { match, set } = await createTestMatchAndSet();
      
      // Set the set to notStarted to test automatic start
      set.status = 'notStarted';
      delete (set as any).startTime; // Remove startTime for notStarted state
      await set.save();

      // Create timeout on not-started set - should trigger set start
      const req: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date()
        }
      };

      const res = mockResponse();
      await createTimeout(req as Request, res);

      // Verify response - timeout creation returns 201
      expect(res.status).toHaveBeenCalledWith(201);
      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Verify set was started
      expect(responseCall.set.status).toBe('inProgress');
      expect(responseCall.set.startTime).toBeDefined();

      // Verify timeout was created
      expect(responseCall.timeout.teamIndex).toBe(0);
      expect(responseCall.set.timeoutsUsed).toEqual([1, 0]);
    });

    it('should void timeout and update timeouts used', async () => {
      // Create test data with a timeout
      const { match, set } = await createTestMatchAndSet();

      // Create a timeout
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false
      });
      await timeout.save();

      // Update set to include timeout
      set.timeouts.push(timeout._id as any);
      set.timeoutsUsed = [1, 0];
      await set.save();

      // Void the timeout
      const req: Partial<Request> = {
        params: { timeoutId: (timeout._id as any).toString() }
      };

      const res = mockResponse();
      await voidTimeout(req as Request, res);

      // Verify response - voiding returns 200 implicitly
      expect(res.json).toHaveBeenCalled();
      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Verify timeout was voided
      expect(responseCall.timeout.voided).toBe(true);

      // Verify set timeouts used was decremented
      expect(responseCall.set.timeoutsUsed[0]).toBe(0);
      expect(responseCall.set.timeoutsUsed[1]).toBe(0);
    });
  });

  describe('Manual Set Completion', () => {
    it('should complete set manually via API', async () => {
      // Create test data
      const { match, set } = await createTestMatchAndSet();

      // Add some goals but not enough to auto-complete
      const goals = [];
      for (let i = 0; i < 3; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() + i * 1000),
          scoringRow: '3-bar',
          voided: false
        });
        await goal.save();
        goals.push(goal._id);
      }

      // Update set scores
      set.goals = goals as any[];
      set.scores = [3, 0];
      await set.save();

      // Complete set manually
      const req: Partial<Request> = {
        params: { setId: (set._id as any).toString() },
        body: { winner: 0 }
      };

      const res = mockResponse();
      await completeSet(req as Request, res);

      // Verify response - completeSet returns 200 implicitly
      expect(res.json).toHaveBeenCalled();
      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Verify set was completed
      expect(responseCall.set.status).toBe('completed');
      expect(responseCall.set.winner).toBe(0);

      // Verify match was updated
      expect(responseCall.match.teams[0].setsWon).toBe(1);

      // Verify progression info
      expect(responseCall.progression.setCompleted).toBe(true);
      expect(responseCall.progression.newSetCreated).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle goal creation with invalid match ID', async () => {
      const req: Partial<Request> = {
        body: {
          matchId: new mongoose.Types.ObjectId().toString(),
          setId: new mongoose.Types.ObjectId().toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res = mockResponse();
      await createGoal(req as Request, res);

      // Should return error status
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle timeout creation when limit exceeded', async () => {
      // Create test data
      const { match, set } = await createTestMatchAndSet();

      // Create maximum timeouts (2 per set)
      for (let i = 0; i < 2; i++) {
        const timeout = new TimeoutModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() + i * 1000),
          voided: false
        });
        await timeout.save();
        set.timeouts.push(timeout._id as any);
      }
      set.timeoutsUsed = [2, 0];
      await set.save();

      // Try to create another timeout (should fail)
      const req: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date()
        }
      };

      const res = mockResponse();
      await createTimeout(req as Request, res);

      // Should return error status
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Match Completion Edge Case', () => {
    it('should correctly handle match completion after voiding last goal and scoring new goal', async () => {
      // This test reproduces the bug where voiding the last goal of a match completion
      // and then scoring another goal doesn't return matchCompleted=true
      const { match, set } = await createTestMatchAndSet();
      
      // Set up match with 2 sets already won (needs 3 to win)
      const completedSet1 = new SetModel({
        matchId: match._id,
        setNumber: 2,
        status: 'completed',
        scores: [5, 2],
        timeoutsUsed: [0, 0],
        goals: [],
        timeouts: [],
        winner: 0,
        endTime: new Date(Date.now() - 60000)
      });
      await completedSet1.save();

      const completedSet2 = new SetModel({
        matchId: match._id,
        setNumber: 3,
        status: 'completed',
        scores: [5, 1],
        timeoutsUsed: [0, 0],
        goals: [],
        timeouts: [],
        winner: 0,
        endTime: new Date(Date.now() - 30000)
      });
      await completedSet2.save();

      // Update match to include these sets and current setsWon
      match.sets.push(completedSet1._id as any, completedSet2._id as any);
      match.teams[0].setsWon = 2;
      match.currentSet = set._id as any;
      await match.save();

      // Create 4 goals for team 0 to set up 4-0 score
      const goals = [];
      for (let i = 0; i < 4; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() - (4 - i) * 1000),
          scoringRow: '3-bar',
          voided: false
        });
        await goal.save();
        goals.push(goal._id);
      }

      // Update set to reflect 4-0 score
      set.goals = goals as any[];
      set.scores = [4, 0];
      await set.save();

      // Step 1: Score the match-winning goal (5-0) - this should complete the match
      const goalReq1: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res1 = mockResponse();
      await createGoal(goalReq1 as Request, res1);

      const responseCall1 = (res1.json as jest.Mock).mock.calls[0][0];
      
      // Verify match was completed
      expect(responseCall1.set.status).toBe('completed');
      expect(responseCall1.set.winner).toBe(0);
      expect(responseCall1.set.scores).toEqual([5, 0]);
      expect(responseCall1.match.status).toBe('completed');
      expect(responseCall1.match.teams[0].setsWon).toBe(3);
      expect(responseCall1.progression.setCompleted).toBe(true);
      expect(responseCall1.progression.matchCompleted).toBe(true);

      // Get the winning goal ID
      const winningGoalId = responseCall1.goal._id;

      // Step 2: Void the match-winning goal - this should revert match to inProgress
      const voidReq: Partial<Request> = {
        params: { goalId: winningGoalId }
      };

      const res2 = mockResponse();
      await voidGoal(voidReq as Request, res2);

      const responseCall2 = (res2.json as jest.Mock).mock.calls[0][0];

      // Verify match was reverted to inProgress
      expect(responseCall2.set.status).toBe('inProgress');
      expect(responseCall2.set.winner).toBeUndefined();
      expect(responseCall2.set.scores).toEqual([4, 0]);
      expect(responseCall2.match.status).toBe('inProgress');
      expect(responseCall2.match.teams[0].setsWon).toBe(2); // Should be back to 2

      // Step 3: Score another goal - this should complete the match again
      const goalReq2: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res3 = mockResponse();
      await createGoal(goalReq2 as Request, res3);

      const responseCall3 = (res3.json as jest.Mock).mock.calls[0][0];

      // This is where the bug occurs - the match should be completed but matchCompleted is false
      expect(responseCall3.set.status).toBe('completed');
      expect(responseCall3.set.winner).toBe(0);
      expect(responseCall3.set.scores).toEqual([5, 0]);
      expect(responseCall3.match.status).toBe('completed');
      expect(responseCall3.match.teams[0].setsWon).toBe(3);
      expect(responseCall3.progression.setCompleted).toBe(true);
      expect(responseCall3.progression.matchCompleted).toBe(true); // This should be true but the bug makes it false
    });

    it('should handle match reversion and completion correctly in complex scenarios', async () => {
      // This test verifies that the fix handles various edge cases correctly
      const { match, set } = await createTestMatchAndSet();
      
      // Set up match with 1 set already won (needs 3 to win)
      const completedSet1 = new SetModel({
        matchId: match._id,
        setNumber: 2,
        status: 'completed',
        scores: [5, 2],
        timeoutsUsed: [0, 0],
        goals: [],
        timeouts: [],
        winner: 0,
        endTime: new Date(Date.now() - 60000)
      });
      await completedSet1.save();

      // Update match to include this set
      match.sets.push(completedSet1._id as any);
      match.teams[0].setsWon = 1;
      match.currentSet = set._id as any;
      await match.save();

      // Create 4 goals for team 0 to set up 4-0 score
      const goals = [];
      for (let i = 0; i < 4; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() - (4 - i) * 1000),
          scoringRow: '3-bar',
          voided: false
        });
        await goal.save();
        goals.push(goal._id);
      }

      set.goals = goals as any[];
      set.scores = [4, 0];
      await set.save();

      // Score a goal to complete the set (but not the match yet - only 2 sets won)
      const goalReq1: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res1 = mockResponse();
      await createGoal(goalReq1 as Request, res1);

      const responseCall1 = (res1.json as jest.Mock).mock.calls[0][0];
      
      // Verify set was completed but match wasn't (only 2 sets won)
      expect(responseCall1.set.status).toBe('completed');
      expect(responseCall1.set.winner).toBe(0);
      expect(responseCall1.match.status).toBe('inProgress');
      expect(responseCall1.match.teams[0].setsWon).toBe(2);
      expect(responseCall1.progression.setCompleted).toBe(true);
      expect(responseCall1.progression.matchCompleted).toBe(false);
      expect(responseCall1.progression.newSetCreated).toBe(true);

      // Get the winning goal ID and the new set ID
      const setWinningGoalId = responseCall1.goal._id;
      const newSetId = responseCall1.match.currentSet;

      // Now score a goal in the new set to set up for match completion
      const goalReq2: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: newSetId,
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res2 = mockResponse();
      await createGoal(goalReq2 as Request, res2);

      // Void the previous set-winning goal - this should revert that set to inProgress
      const voidReq1: Partial<Request> = {
        params: { goalId: setWinningGoalId }
      };

      const res3 = mockResponse();
      await voidGoal(voidReq1 as Request, res3);

      const responseCall3 = (res3.json as jest.Mock).mock.calls[0][0];

      // Verify the previous set was reverted and match setsWon updated
      expect(responseCall3.set.status).toBe('inProgress');
      expect(responseCall3.set.winner).toBeUndefined();
      expect(responseCall3.match.teams[0].setsWon).toBe(1); // Back to 1 set won

      // Now score the winning goal again to complete the match
      const goalReq3: Partial<Request> = {
        body: {
          matchId: (match._id as any).toString(),
          setId: (responseCall3.set._id as any).toString(),
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: '3-bar'
        }
      };

      const res4 = mockResponse();
      await createGoal(goalReq3 as Request, res4);

      const responseCall4 = (res4.json as jest.Mock).mock.calls[0][0];

      // Verify set completion again
      expect(responseCall4.set.status).toBe('completed');
      expect(responseCall4.set.winner).toBe(0);
      expect(responseCall4.match.teams[0].setsWon).toBe(2); // Back to 2 sets won
      expect(responseCall4.progression.setCompleted).toBe(true);
      expect(responseCall4.progression.matchCompleted).toBe(false); // Still not match winning

      // Continue scoring in the new set until we can test match completion
      for (let i = 0; i < 5; i++) {
        const goalReq: Partial<Request> = {
          body: {
            matchId: (match._id as any).toString(),
            setId: newSetId,
            teamIndex: 0,
            timestamp: new Date(),
            scoringRow: '3-bar'
          }
        };

        const res = mockResponse();
        await createGoal(goalReq as Request, res);

        if (i === 4) { // Last goal should complete the match
          const responseCall = (res.json as jest.Mock).mock.calls[0][0];
          expect(responseCall.progression.matchCompleted).toBe(true);
          expect(responseCall.match.status).toBe('completed');
          expect(responseCall.match.teams[0].setsWon).toBe(3);
        }
      }
    });
  });
});
