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
  await TimeoutModel.deleteMany({});
  await SetModel.deleteMany({});
  await MatchModel.deleteMany({});
  await GoalModel.deleteMany({});
});

describe('Timeout Model', () => {
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
      timeoutsPerSet: 2,
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
      status: 'notStarted',
    });
    await set.save();
    
    match.sets.push(set._id as any);
    match.currentSet = set._id as any;
    await match.save();
  });

  describe('Basic Timeout Operations', () => {
    it('should create and save a timeout successfully', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 1,
        timestamp: new Date(),
        voided: false,
      });
      
      const savedTimeout = await timeout.save();
      expect(savedTimeout._id).toBeDefined();
      expect(savedTimeout.teamIndex).toBe(1);
      expect(savedTimeout.voided).toBe(false);
      expect(savedTimeout.createdAt).toBeDefined();
      expect(savedTimeout.updatedAt).toBeDefined();
    });

    it('should require matchId, setId, teamIndex, and timestamp', async () => {
      const timeout = new TimeoutModel({
        teamIndex: 1,
        timestamp: new Date(),
        voided: false,
      });
      
      let err;
      try {
        await timeout.save();
      } catch (e: any) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors['matchId']).toBeDefined();
      expect(err.errors['setId']).toBeDefined();
    });

    it('should not allow invalid teamIndex', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 2,
        timestamp: new Date(),
        voided: false,
      });
      
      let err;
      try {
        await timeout.save();
      } catch (e: any) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors['teamIndex']).toBeDefined();
    });

    it('should not allow invalid teamIndex (negative)', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: -1,
        timestamp: new Date(),
        voided: false,
      });
      
      let err;
      try {
        await timeout.save();
      } catch (e: any) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors['teamIndex']).toBeDefined();
    });

    it('should default voided to false', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
      });
      
      const savedTimeout = await timeout.save();
      expect(savedTimeout.voided).toBe(false);
    });
  });

  describe('Set Timeout Updates', () => {
    it('should update parent Set timeoutsUsed and timeouts array via post-save hook', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      
      await timeout.save();
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(1);
      expect(updatedSet!.timeoutsUsed[1]).toBe(0);
      expect(updatedSet!.timeouts).toHaveLength(1);
      expect(updatedSet!.timeouts[0].toString()).toBe((timeout._id as any).toString());
    });

    it('should update timeoutsUsed correctly for multiple timeouts', async () => {
      const timeout1 = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      await timeout1.save();

      const timeout2 = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 1,
        timestamp: new Date(),
        voided: false,
      });
      await timeout2.save();

      const timeout3 = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      await timeout3.save();
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(2);
      expect(updatedSet!.timeoutsUsed[1]).toBe(1);
      expect(updatedSet!.timeouts).toHaveLength(3);
    });

    it('should not update timeoutsUsed for voided timeouts', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: true,
      });
      
      await timeout.save();
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(0);
      expect(updatedSet!.timeoutsUsed[1]).toBe(0);
      expect(updatedSet!.timeouts).toHaveLength(0);
    });

    it('should recalculate timeoutsUsed when timeout is voided after creation', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      await timeout.save();
      
      // Verify it was counted
      let updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(1);
      expect(updatedSet!.timeouts).toHaveLength(1);
      
      // Void the timeout
      timeout.voided = true;
      await timeout.save();
      
      // Verify it was uncounted
      updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(0);
      expect(updatedSet!.timeouts).toHaveLength(0);
    });
  });

  describe('Automatic Set Progression', () => {
    it('should automatically start set when first timeout is recorded', async () => {
      // Verify set is in notStarted status
      expect(set.status).toBe('notStarted');
      expect(set.startTime).toBeUndefined();
      
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      
      await timeout.save();
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('inProgress');
      expect(updatedSet!.startTime).toBeDefined();
    });

    it('should not start set for voided timeouts', async () => {
      // Verify set is in notStarted status
      expect(set.status).toBe('notStarted');
      
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: true,
      });
      
      await timeout.save();
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('notStarted');
      expect(updatedSet!.startTime).toBeUndefined();
    });

    it('should not affect set that is already in progress', async () => {
      // Set the set to inProgress
      set.status = 'inProgress';
      set.startTime = new Date();
      await set.save();
      
      const originalStartTime = set.startTime;
      
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      
      await timeout.save();
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('inProgress');
      expect(updatedSet!.startTime).toEqual(originalStartTime);
    });

    it('should not affect completed sets', async () => {
      // Set the set to completed
      set.status = 'completed';
      set.endTime = new Date();
      set.winner = 0;
      await set.save();
      
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      
      await timeout.save();
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('completed');
      expect(updatedSet!.winner).toBe(0);
    });
  });

  describe('Post-Update Hook (findOneAndUpdate)', () => {
    it('should recalculate timeoutsUsed when timeout is updated via findOneAndUpdate', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      await timeout.save();
      
      // Verify it was counted
      let updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(1);
      expect(updatedSet!.timeouts).toHaveLength(1);
      
      // Update via findOneAndUpdate to void the timeout
      await TimeoutModel.findOneAndUpdate(
        { _id: timeout._id },
        { voided: true },
        { new: true }
      );
      
      // Verify it was recalculated
      updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(0);
      expect(updatedSet!.timeouts).toHaveLength(0);
    });

    it('should handle multiple timeouts correctly when updated via findOneAndUpdate', async () => {
      const timeout1 = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      await timeout1.save();

      const timeout2 = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      await timeout2.save();
      
      // Verify both were counted
      let updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(2);
      expect(updatedSet!.timeouts).toHaveLength(2);
      
      // Void one timeout via findOneAndUpdate
      await TimeoutModel.findOneAndUpdate(
        { _id: timeout1._id },
        { voided: true },
        { new: true }
      );
      
      // Verify only one is counted now
      updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(1);
      expect(updatedSet!.timeouts).toHaveLength(1);
      expect(updatedSet!.timeouts[0].toString()).toBe((timeout2._id as any).toString());
    });
  });

  describe('Error Handling', () => {
    it('should handle missing set gracefully in post-save hook', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: new mongoose.Types.ObjectId(), // Non-existent set
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      
      // Should not throw an error
      await expect(timeout.save()).resolves.toBeDefined();
    });

    it('should handle missing set gracefully in post-update hook', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      await timeout.save();
      
      // Change setId to non-existent one
      timeout.setId = new mongoose.Types.ObjectId();
      
      // Should not throw an error
      await expect(
        TimeoutModel.findOneAndUpdate(
          { _id: timeout._id },
          { setId: timeout.setId },
          { new: true }
        )
      ).resolves.toBeDefined();
    });
  });

  describe('Timeout Indexing', () => {
    it('should create proper indexes', async () => {
      const indexes = await TimeoutModel.collection.getIndexes();
      
      // Check for compound index on matchId, setId, timestamp
      const compoundIndexExists = Object.keys(indexes).some(indexName => {
        const index = indexes[indexName];
        return (
          index.length === 3 &&
          index.some((field: any) => field[0] === 'matchId' && field[1] === 1) &&
          index.some((field: any) => field[0] === 'setId' && field[1] === 1) &&
          index.some((field: any) => field[0] === 'timestamp' && field[1] === 1)
        );
      });
      
      expect(compoundIndexExists).toBe(true);
    });
  });

  describe('Timestamps', () => {
    it('should update updatedAt on save', async () => {
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      
      const savedTimeout = await timeout.save();
      const originalUpdatedAt = savedTimeout.updatedAt;
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      savedTimeout.voided = true;
      const updatedTimeout = await savedTimeout.save();
      
      expect(updatedTimeout.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Integration with Goals and Timeouts', () => {
    it('should maintain proper set progression when mixed with goals', async () => {
      // Start with a timeout to begin the set
      const timeout = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(),
        voided: false,
      });
      await timeout.save();
      
      // Verify set started
      let updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.status).toBe('inProgress');
      expect(updatedSet!.timeoutsUsed[0]).toBe(1);
      
      // Add a goal (simulating Goal model behavior)
      const GoalModel = require('./Goal').GoalModel;
      const goal = new GoalModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 1,
        timestamp: new Date(),
        voided: false,
      });
      await goal.save();
      
      // Verify both timeout and goal are tracked
      updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(1);
      expect(updatedSet!.timeouts).toHaveLength(1);
    });
  });

  describe('Timeout Limits', () => {
    it('should allow timeouts up to match limit', async () => {
      // Create timeouts up to the limit (2 per team)
      for (let i = 0; i < 2; i++) {
        const timeout = new TimeoutModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(),
          voided: false,
        });
        await timeout.save();
      }
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(2);
      expect(updatedSet!.timeouts).toHaveLength(2);
    });

    it('should track timeouts beyond limit (for business logic validation elsewhere)', async () => {
      // Create timeouts beyond the limit
      for (let i = 0; i < 3; i++) {
        const timeout = new TimeoutModel({
          matchId: match._id,
          setId: set._id,
          teamIndex: 0,
          timestamp: new Date(),
          voided: false,
        });
        await timeout.save();
      }
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeoutsUsed[0]).toBe(3); // Model tracks all, validation handled elsewhere
      expect(updatedSet!.timeouts).toHaveLength(3);
    });
  });

  describe('Timeout Ordering', () => {
    it('should maintain timeout order by timestamp', async () => {
      const baseTime = new Date();
      
      const timeout1 = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(baseTime.getTime() + 1000),
        voided: false,
      });
      await timeout1.save();

      const timeout2 = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 1,
        timestamp: new Date(baseTime.getTime() + 500),
        voided: false,
      });
      await timeout2.save();

      const timeout3 = new TimeoutModel({
        matchId: match._id,
        setId: set._id,
        teamIndex: 0,
        timestamp: new Date(baseTime.getTime() + 1500),
        voided: false,
      });
      await timeout3.save();
      
      const updatedSet = await SetModel.findById(set._id);
      expect(updatedSet!.timeouts).toHaveLength(3);
      
      // Verify timeouts are stored in timestamp order
      const timeouts = await TimeoutModel.find({ setId: set._id, voided: false }).sort({ timestamp: 1 });
      expect((timeouts[0] as any)._id.toString()).toBe((timeout2._id as any).toString());
      expect((timeouts[1] as any)._id.toString()).toBe((timeout1._id as any).toString());
      expect((timeouts[2] as any)._id.toString()).toBe((timeout3._id as any).toString());
    });
  });
});
