import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GoalModel } from './Goal';
import { SetModel } from './Set';
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

describe('Set Model', () => {
  it('should create and save a set successfully', async () => {
    const set = new SetModel({
      matchId: new mongoose.Types.ObjectId(),
      setNumber: 1,
      scores: [5, 3],
      timeoutsUsed: [1, 2],
      goals: [],
      timeouts: [],
      startTime: new Date(),
      endTime: new Date(),
      status: 'completed',
      winner: 0,
    });
    const savedSet = await set.save();
    expect(savedSet._id).toBeDefined();
    expect(savedSet.scores).toEqual([5, 3]);
    expect(savedSet.status).toBe('completed');
  });

  it('should require exactly two scores and timeoutsUsed', async () => {
    const set = new SetModel({
      matchId: new mongoose.Types.ObjectId(),
      setNumber: 1,
      scores: [5],
      timeoutsUsed: [1],
      goals: [],
      timeouts: [],
      status: 'notStarted',
    });
    let err;
    try {
      await set.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors['scores']).toBeDefined();
    expect(err.errors['timeoutsUsed']).toBeDefined();
  });
});

describe('Goal Model', () => {
  it('should create and save a goal successfully', async () => {
    const goal = new GoalModel({
      matchId: new mongoose.Types.ObjectId(),
      setId: new mongoose.Types.ObjectId(),
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
  });

  it('should not allow invalid teamIndex', async () => {
    const goal = new GoalModel({
      matchId: new mongoose.Types.ObjectId(),
      setId: new mongoose.Types.ObjectId(),
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

  it('should update parent Set scores and goals array via post-save hook', async () => {
    // Create a Set
    const set = new SetModel({
      matchId: new mongoose.Types.ObjectId(),
      setNumber: 1,
      scores: [0, 0],
      timeoutsUsed: [0, 0],
      goals: [],
      timeouts: [],
      status: 'inProgress',
    });
    const savedSet = await set.save();

    // Create a Goal for team 1
    const goal = new GoalModel({
      matchId: savedSet.matchId,
      setId: savedSet._id,
      teamIndex: 1,
      timestamp: new Date(),
      scoringRow: '3-bar',
      voided: false,
    });
    await goal.save();

    // Fetch the set again and check updates
    const updatedSet = await SetModel.findById(savedSet._id);
    expect(updatedSet).toBeDefined();
    expect(updatedSet!.scores[1]).toBe(1);
    expect(updatedSet!.goals).toContainEqual(goal._id);
  });
});

describe('Timeout Model', () => {
  it('should create and save a timeout successfully', async () => {
    const timeout = new TimeoutModel({
      matchId: new mongoose.Types.ObjectId(),
      setId: new mongoose.Types.ObjectId(),
      teamIndex: 0,
      timestamp: new Date(),
      voided: false,
    });
    const savedTimeout = await timeout.save();
    expect(savedTimeout._id).toBeDefined();
    expect(savedTimeout.teamIndex).toBe(0);
    expect(savedTimeout.voided).toBe(false);
  });

  it('should not allow invalid teamIndex', async () => {
    const timeout = new TimeoutModel({
      matchId: new mongoose.Types.ObjectId(),
      setId: new mongoose.Types.ObjectId(),
      teamIndex: -1,
      timestamp: new Date(),
      voided: false,
    });
    let err;
    try {
      await timeout.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors['teamIndex']).toBeDefined();
  });
});
