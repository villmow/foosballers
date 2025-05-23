import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GoalModel } from './Goal';
import { MatchModel } from './Match';
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

describe('Set Model - Automatic Set Progression', () => {
  let matchId: mongoose.Types.ObjectId;
  let match: any;

  beforeAll(async () => {
    // Connect to in-memory MongoDB or test DB
    // await mongoose.connect('mongodb://localhost:27017/test');
  });

  beforeEach(async () => {
    match = new MatchModel({
      teams: [
        { name: 'A', color: 'red', players: [{ name: 'P1', playerId: null }], setsWon: 0 },
        { name: 'B', color: 'blue', players: [{ name: 'P2', playerId: null }], setsWon: 0 }
      ],
      numGoalsToWin: 2,
      numSetsToWin: 2,
      twoAhead: false,
      playerSetup: '1v1',
      createdBy: new mongoose.Types.ObjectId(),
      sets: [],
      status: 'inProgress',
    });
    await match.save();
    matchId = match._id;

    // Create and add the first set to the match
    const initialSet = new SetModel({
      matchId,
      setNumber: 1,
      scores: [0, 0],
      timeoutsUsed: [0, 0],
      status: 'notStarted',
    });
    await initialSet.save();
    match.sets.push(initialSet._id);
    match.currentSet = initialSet._id;
    await match.save();
  });

  afterEach(async () => {
    await SetModel.deleteMany({});
    await MatchModel.deleteMany({});
  });

  afterAll(async () => {
    // await mongoose.disconnect();
  });

  it('should automatically start a new set if match is not won', async () => {
    // Update the first set to completed with team 0 winning
    const firstSet = await SetModel.findOne({ matchId, setNumber: 1 });
    if (firstSet) {
      firstSet.scores = [2, 0];
      firstSet.status = 'completed';
      firstSet.winner = 0;
      await firstSet.save();
    }
    
    const updatedMatch = await MatchModel.findById(matchId);
    expect(updatedMatch?.teams[0].setsWon).toBe(1);
    expect(updatedMatch?.status).toBe('inProgress');
    // Should have a new set created
    expect(updatedMatch?.sets.length).toBe(2); // original + new
    const newSetId = updatedMatch?.sets[1];
    const newSet = await SetModel.findById(newSetId);
    expect(newSet).toBeTruthy();
    expect(newSet?.setNumber).toBe(2);
    expect(newSet?.status).toBe('notStarted');
  });

  it('should end the match if a team reaches numSetsToWin', async () => {
    // First set win - update the existing set
    const firstSet = await SetModel.findOne({ matchId, setNumber: 1 });
    if (firstSet) {
      firstSet.scores = [2, 0];
      firstSet.status = 'completed';
      firstSet.winner = 0;
      await firstSet.save();
    }
    
    // Second set win - should be automatically created, so find and complete it
    let updatedMatch = await MatchModel.findById(matchId);
    expect(updatedMatch?.sets.length).toBe(2); // first + auto-created second
    
    const secondSetId = updatedMatch?.sets[1];
    const secondSet = await SetModel.findById(secondSetId);
    if (secondSet) {
      secondSet.scores = [2, 0];
      secondSet.status = 'completed';
      secondSet.winner = 0;
      await secondSet.save();
    }
    
    updatedMatch = await MatchModel.findById(matchId);
    expect(updatedMatch?.teams[0].setsWon).toBe(2);
    expect(updatedMatch?.status).toBe('completed');
    expect(updatedMatch?.endTime).toBeInstanceOf(Date);
  });

  it('should not start a new set if match is completed', async () => {
    // Simulate team 0 already at numSetsToWin
    match.teams[0].setsWon = 2;
    match.status = 'completed';
    await match.save();
    
    // Try to complete another set - this should not trigger auto-creation
    const additionalSet = new SetModel({
      matchId,
      setNumber: 3,
      scores: [2, 0],
      timeoutsUsed: [0, 0],
      status: 'completed',
      winner: 0,
    });
    await additionalSet.save();
    
    const updatedMatch = await MatchModel.findById(matchId);
    // Should still only have the original set plus the additional one we manually created
    // No new set should be auto-created because match is already completed
    expect(updatedMatch?.sets.length).toBe(1); // Only the initial set from beforeEach
  });
});
