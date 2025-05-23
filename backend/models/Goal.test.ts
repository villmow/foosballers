import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GoalModel } from './Goal';
import { IMatch, MatchModel } from './Match';
import { ISet, SetModel } from './Set';
import { TimeoutModel } from './Timeout';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await GoalModel.deleteMany({});
  await SetModel.deleteMany({});
  await MatchModel.deleteMany({});
  await TimeoutModel.deleteMany({});
});

describe('Goal Model', () => {
  let match: IMatch;
  let set: ISet;

  beforeEach(async () => {
    // Create a test match
    match = new MatchModel({
      teams: [
        { name: 'Team A', color: 'red', players: [{ name: 'Player 1', playerId: null }], setsWon: 0 },
        { name: 'Team B', color: 'blue', players: [{ name: 'Player 2', playerId: null }], setsWon: 0 }
      ],
      numGoalsToWin: 5,
      numSetsToWin: 2,
      twoAhead: false,
      playerSetup: '1v1',
      createdBy: new mongoose.Types.ObjectId(),
      sets: [],
      status: 'inProgress',
    });
    await match.save();

    // Create a test set
    set = new SetModel({
      matchId: match._id,
      setNumber: 1,
      scores: [0, 0],
      timeoutsUsed: [0, 0],
      goals: [],
      timeouts: [],
      status: 'inProgress',
    });
    await set.save();
    
    match.sets.push(set._id as any);
    match.currentSet = set._id as any;
    await match.save();
  });

  describe('Basic Goal Operations', () => {
    it('should create and save a goal successfully', async () => {
      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 1,
        timestamp: new Date(),
        scoringRow: '3-bar',
        voided: false,
      });
      
      const savedGoal = await goal.save();
      expect(savedGoal._id).toBeDefined();
      expect(savedGoal.teamIndex).toBe(1);
      expect(savedGoal.scoringRow).toBe('3-bar');
      expect(savedGoal.voided).toBe(false);
      expect(savedGoal.createdAt).toBeDefined();
      expect(savedGoal.updatedAt).toBeDefined();
    });

    it('should require matchId, setId, teamIndex, and timestamp', async () => {
      const goal = new GoalModel({
        teamIndex: 1,
        timestamp: new Date(),
        voided: false,
      });
      
      let err;
      try {
        await goal.validate();
      } catch (e: any) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors['matchId']).toBeDefined();
      expect(err.errors['setId']).toBeDefined();
    });

    it('should not allow invalid teamIndex', async () => {
      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 2,
        timestamp: new Date(),
        voided: false,
      });
      
      let err;
      try {
        await goal.validate();
      } catch (e: any) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors['teamIndex']).toBeDefined();
    });

    it('should not allow invalid teamIndex (negative)', async () => {
      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: -1,
        timestamp: new Date(),
        voided: false,
      });
      
      let err;
      try {
        await goal.validate();
      } catch (e: any) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors['teamIndex']).toBeDefined();
    });

    it('should allow valid scoring rows', async () => {
      const scoringRows = ['goalie', '2-bar', '5-bar', '3-bar'];
      
      for (const row of scoringRows) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(),
          scoringRow: row,
          voided: false,
        });
        
        const savedGoal = await goal.save();
        expect(savedGoal.scoringRow).toBe(row);
        await GoalModel.deleteOne({ _id: savedGoal._id });
      }
    });

    it('should not allow invalid scoring row', async () => {
      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        scoringRow: 'invalid-row',
        voided: false,
      });
      
      let err;
      try {
        await goal.validate();
      } catch (e: any) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors['scoringRow']).toBeDefined();
    });

    it('should default voided to false', async () => {
      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
      });
      
      expect(goal.voided).toBe(false);
    });
  });

  describe('Set Score Updates', () => {
    it('should update parent Set scores and goals array via post-save hook', async () => {
      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 1,
        timestamp: new Date(),
        scoringRow: '3-bar',
        voided: false,
      });
      
      await goal.save();

      // Fetch the set again and check updates
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet).toBeDefined();
      expect(updatedSet!.scores[1]).toBe(1);
      expect(updatedSet!.scores[0]).toBe(0);
      expect(updatedSet!.goals).toContainEqual(goal._id);
    });

    it('should update scores correctly for multiple goals', async () => {
      // Score 3 goals for team 0 and 2 goals for team 1
      const goals = [];
      
      for (let i = 0; i < 3; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() + i * 1000),
          voided: false,
        });
        goals.push(await goal.save());
      }
      
      for (let i = 0; i < 2; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 1,
          timestamp: new Date(Date.now() + (i + 3) * 1000),
          voided: false,
        });
        goals.push(await goal.save());
      }

      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.scores).toEqual([3, 2]);
      expect(updatedSet!.goals).toHaveLength(5);
    });

    it('should not update scores for voided goals', async () => {
      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: true,
      });
      
      await goal.save();

      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.scores).toEqual([0, 0]);
      expect(updatedSet!.goals).toHaveLength(0);
    });

    it('should decrement score when goal is voided after creation', async () => {
      // First, create a valid goal
      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      await goal.save();

      // Verify score was incremented
      let updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.scores[0]).toBe(1);

      // Now void the goal
      goal.voided = true;
      await goal.save();

      // Verify score was decremented
      updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.scores[0]).toBe(0);
    });
  });

  describe('Automatic Set Completion', () => {
    it('should automatically complete set when winning condition is met', async () => {
      // Score goals to reach the winning condition (5 goals)
      for (let i = 0; i < 5; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() + i * 1000),
          voided: false,
        });
        await goal.save();
      }

      // Check that set was automatically completed
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('completed');
      expect(updatedSet!.winner).toBe(0);
      expect(updatedSet!.endTime).toBeDefined();
      expect(updatedSet!.scores).toEqual([5, 0]);
    });

    it('should respect two-ahead rule when enabled', async () => {
      // Update match to require two-ahead rule
      match.twoAhead = true;
      await match.save();

      // Create a 5-4 scenario by alternating goals to avoid early completion
      // We'll create: 1-0, 1-1, 2-1, 2-2, 3-2, 3-3, 4-3, 4-4, 5-4
      const goalSequence = [
        { team: 0, expectedScore: [1, 0] },
        { team: 1, expectedScore: [1, 1] },
        { team: 0, expectedScore: [2, 1] },
        { team: 1, expectedScore: [2, 2] },
        { team: 0, expectedScore: [3, 2] },
        { team: 1, expectedScore: [3, 3] },
        { team: 0, expectedScore: [4, 3] },
        { team: 1, expectedScore: [4, 4] },
        { team: 0, expectedScore: [5, 4] }, // This should NOT complete the set (only 1 ahead)
      ];

      for (let i = 0; i < goalSequence.length; i++) {
        const { team } = goalSequence[i];
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: team,
          timestamp: new Date(Date.now() + i * 1000),
          voided: false,
        });
        await goal.save();
      }

      // Set should still be in progress (5-4, need 2 ahead)
      let updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('inProgress');
      expect(updatedSet!.scores).toEqual([5, 4]);

      // Score one more for team 0 (6-4, now 2 ahead)
      const finalGoal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(Date.now() + 9 * 1000),
        voided: false,
      });
      await finalGoal.save();

      // Now set should be completed
      updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('completed');
      expect(updatedSet!.winner).toBe(0);
      expect(updatedSet!.scores).toEqual([6, 4]);
    });

    it('should revert set to inProgress when winning goal is voided', async () => {
      // Score the winning goal
      for (let i = 0; i < 5; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() + i * 1000),
          voided: false,
        });
        await goal.save();
      }

      // Verify set is completed
      let updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('completed');
      expect(updatedSet!.winner).toBe(0);

      // Void the last goal
      const lastGoal = await GoalModel.findOne({ setId: set._id, teamIndex: 0 }).sort({ timestamp: -1 });
      lastGoal!.voided = true;
      await lastGoal!.save();

      // Set should be reverted to inProgress
      updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('inProgress');
      expect(updatedSet!.winner).toBeUndefined();
      expect(updatedSet!.endTime).toBeUndefined();
      expect(updatedSet!.scores).toEqual([4, 0]);
    });

    it('should revert set to inProgress when two-ahead rule is no longer satisfied', async () => {
      // Update match to require two-ahead rule
      match.twoAhead = true;
      await match.save();

      // Create a 6-4 scenario by alternating goals to complete the set properly
      // We'll create: 1-0, 1-1, 2-1, 2-2, 3-2, 3-3, 4-3, 4-4, 5-4, 6-4 (completes)
      const goalSequence = [
        { team: 0, expectedScore: [1, 0] },
        { team: 1, expectedScore: [1, 1] },
        { team: 0, expectedScore: [2, 1] },
        { team: 1, expectedScore: [2, 2] },
        { team: 0, expectedScore: [3, 2] },
        { team: 1, expectedScore: [3, 3] },
        { team: 0, expectedScore: [4, 3] },
        { team: 1, expectedScore: [4, 4] },
        { team: 0, expectedScore: [5, 4] }, // Still in progress (only 1 ahead)
        { team: 0, expectedScore: [6, 4] }, // This completes the set (2 ahead)
      ];

      for (let i = 0; i < goalSequence.length; i++) {
        const { team } = goalSequence[i];
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: team,
          timestamp: new Date(Date.now() + i * 1000),
          voided: false,
        });
        await goal.save();
      }

      // Verify set is completed
      let updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('completed');
      expect(updatedSet!.winner).toBe(0);

      // Add a goal for team 1 (making it 6-5, no longer 2 ahead)
      const closeGoal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 1,
        timestamp: new Date(Date.now() + 20 * 1000),
        voided: false,
      });
      await closeGoal.save();

      // Set should be reverted to inProgress (6-5, not 2 ahead)
      updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('inProgress');
      expect(updatedSet!.winner).toBeUndefined();
      expect(updatedSet!.endTime).toBeUndefined();
      expect(updatedSet!.scores).toEqual([6, 5]);
    });
  });

  describe('Match Progression Integration', () => {
    it('should trigger match progression when set is completed', async () => {
      // Score the winning goal to complete the set
      for (let i = 0; i < 5; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() + i * 1000),
          voided: false,
        });
        await goal.save();
      }

      // Check that set was completed and match progression was triggered
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('completed');
      expect(updatedSet!.winner).toBe(0);

      // The Set's post-save hook should have updated the match
      const updatedMatch = await MatchModel.findById(match._id);
      expect(updatedMatch!.teams[0].setsWon).toBe(1);
      
      // Since this is not the final set (need 2 to win), a new set should be created
      expect(updatedMatch!.sets).toHaveLength(2);
      expect(updatedMatch!.status).toBe('inProgress');
    });

    it('should complete match when final set is won', async () => {
      // First, complete one set for team 0
      for (let i = 0; i < 5; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() + i * 1000),
          voided: false,
        });
        await goal.save();
      }

      // Get the new set that was auto-created
      const updatedMatch = await MatchModel.findById(match._id).populate('sets');
      const secondSetId = updatedMatch!.sets[1];
      
      // Complete the second set for team 0 (should win the match)
      for (let i = 0; i < 5; i++) {
        const goal = new GoalModel({
          matchId: match._id,
          setId: secondSetId,
          teamIndex: 0,
          timestamp: new Date(Date.now() + (i + 10) * 1000),
          voided: false,
        });
        await goal.save();
      }

      // Check that match was completed
      const finalMatch = await MatchModel.findById(match._id);
      expect(finalMatch!.teams[0].setsWon).toBe(2);
      expect(finalMatch!.status).toBe('completed');
      expect(finalMatch!.endTime).toBeDefined();
    });
  });

  describe('Post-Update Hook (findOneAndUpdate)', () => {
    it('should recalculate scores when goal is updated via findOneAndUpdate', async () => {
      // Create multiple goals
      const goal1 = await GoalModel.create({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });

      const goal2 = await GoalModel.create({
        matchId: match._id,
        setId: set._id,
        teamIndex: 1,
        timestamp: new Date(),
        voided: false,
      });

      // Verify initial scores
      let updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.scores).toEqual([1, 1]);

      // Use findOneAndUpdate to void one goal
      await GoalModel.findOneAndUpdate(
        { _id: goal1._id },
        { voided: true },
        { new: true }
      );

      // Verify scores were recalculated
      updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.scores).toEqual([0, 1]);
      expect(updatedSet!.goals).toHaveLength(1);
      expect(updatedSet!.goals).toContainEqual(goal2._id);
    });

    it('should handle set completion via findOneAndUpdate', async () => {
      // Create 4 goals for team 0
      for (let i = 0; i < 4; i++) {
        await GoalModel.create({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(Date.now() + i * 1000),
          voided: false,
        });
      }

      // Create a voided goal that would be the winning goal
      const voidedGoal = await GoalModel.create({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(Date.now() + 4 * 1000),
        voided: true,
      });

      // Verify set is still in progress
      let updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('inProgress');
      expect(updatedSet!.scores).toEqual([4, 0]);

      // Unvoid the goal using findOneAndUpdate
      await GoalModel.findOneAndUpdate(
        { _id: voidedGoal._id },
        { voided: false },
        { new: true }
      );

      // Verify set was completed
      updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('completed');
      expect(updatedSet!.winner).toBe(0);
      expect(updatedSet!.scores).toEqual([5, 0]);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing set gracefully in post-save hook', async () => {
      const invalidSetId = new mongoose.Types.ObjectId();
      const goal = new GoalModel({
        matchId: match._id,
        setId: invalidSetId,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });

      // Should not throw an error
      await expect(goal.save()).resolves.toBeDefined();
    });

    it('should handle missing match gracefully in post-save hook', async () => {
      const invalidMatchId = new mongoose.Types.ObjectId();
      const goal = new GoalModel({
        matchId: invalidMatchId,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });

      // Should not throw an error, but set should still be updated
      await expect(goal.save()).resolves.toBeDefined();
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.scores[0]).toBe(1);
    });

    it('should only check winning conditions for sets in progress', async () => {
      // Manually set the set to completed
      set.status = 'completed';
      set.winner = 1;
      await set.save();

      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });

      await goal.save();

      // Set should remain completed with original winner
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('completed');
      expect(updatedSet!.winner).toBe(1);
      expect(updatedSet!.scores[0]).toBe(1); // Score still updated
    });
  });

  describe('Goal Indexing', () => {
    it('should create proper indexes', async () => {
      const indexes = await GoalModel.collection.getIndexes();
      
      // Check for the compound index on matchId, setId, timestamp
      const compoundIndex = Object.keys(indexes).find(key => 
        key.includes('matchId_1_setId_1_timestamp_1')
      );
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should update updatedAt on save', async () => {
      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });

      const savedGoal = await goal.save();
      const initialUpdatedAt = savedGoal.updatedAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedGoal.scoringRow = '5-bar';
      await savedGoal.save();

      expect(savedGoal.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });
});
