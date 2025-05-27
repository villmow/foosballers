import { SetManager } from './SetManager';

describe('SetManager', () => {
  let set: any;
  let match: any;
  let manager: SetManager;

  beforeEach(() => {
    set = {
      scores: [0, 0],
      status: 'notStarted',
      setNumber: 1,
      matchId: 'matchid',
      timeoutsUsed: [0, 0],
      goals: [],
      timeouts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      winner: undefined,
      startTime: null,
      endTime: null,
      _id: 'setid',
    };
    match = {
      status: 'inProgress',
      numGoalsToWin: 5,
      twoAhead: false,
      teams: [
        { name: 'A', color: 'red', players: [], setsWon: 0 },
        { name: 'B', color: 'blue', players: [], setsWon: 0 },
      ],
      playerSetup: '1v1',
      createdBy: 'userid',
      sets: [],
      currentSet: 'setid',
      createdAt: new Date(),
      updatedAt: new Date(),
      numSetsToWin: 2,
      draw: false,
      timeoutsPerSet: 2,
      name: 'Test',
      startTime: null,
      endTime: null,
      _id: 'matchid',
    };
    manager = new SetManager(set, match);
  });

  it('starts a set from notStarted', () => {
    manager.startSet();
    expect(set.status).toBe('inProgress');
    expect(set.startTime).toBeInstanceOf(Date);
  });

  it('throws if starting set not from notStarted', () => {
    set.status = 'inProgress';
    expect(() => manager.startSet()).toThrow();
  });

  it('throws if match is not in progress', () => {
    match.status = 'notStarted';
    expect(() => manager.startSet()).toThrow();
  });

  it('records a goal and checks winning condition', () => {
    manager.startSet();
    for (let i = 0; i < 5; i++) manager.recordGoal(0);
    expect(set.scores[0]).toBe(5);
    expect(set.status).toBe('completed');
    expect(set.winner).toBe(0);
    expect(set.endTime).toBeInstanceOf(Date);
  });

  it('throws if recording goal when set not in progress', () => {
    expect(() => manager.recordGoal(0)).toThrow();
  });

  it('enforces two-ahead rule only in deciding set', () => {
    match.twoAhead = true;
    
    // Test non-deciding set (neither team has numSetsToWin - 1 sets won)
    // This should NOT apply two-ahead rule
    manager.startSet();
    set.scores = [4, 4];
    manager.recordGoal(0); // 5-4, should complete since it's not deciding set
    expect(set.status).toBe('completed');
    expect(set.winner).toBe(0);
  });

  it('does not enforce two-ahead rule in non-deciding sets', () => {
    match.twoAhead = true;
    match.teams[0].setsWon = 0; // Team 0 has 0 sets
    match.teams[1].setsWon = 1; // Team 1 has 1 set, not 1-1 so not deciding
    
    manager.startSet();
    set.scores = [4, 4];
    manager.recordGoal(0); // 5-4, should complete since it's not deciding set
    expect(set.status).toBe('completed');
    expect(set.winner).toBe(0);
  });

  it('enforces two-ahead rule in deciding set (1-1 for best of 3)', () => {
    match.twoAhead = true;
    match.numSetsToWin = 2; // Best of 3
    match.teams[0].setsWon = 1; // 1-1, this is the deciding set
    match.teams[1].setsWon = 1;
    
    manager.startSet();
    set.scores = [4, 4];
    manager.recordGoal(0); // 5-4, not enough in deciding set
    expect(set.status).toBe('inProgress');
    
    set.scores = [6, 4];
    manager.checkWinningCondition(); // 6-4, enough (2 ahead)
    expect(set.status).toBe('completed');
    expect(set.winner).toBe(0);
  });

  it('enforces two-ahead rule in deciding set (2-2 for best of 5)', () => {
    match.twoAhead = true;
    match.numSetsToWin = 3; // Best of 5
    match.teams[0].setsWon = 2; // 2-2, this is the deciding set
    match.teams[1].setsWon = 2;
    
    manager.startSet();
    set.scores = [4, 4];
    manager.recordGoal(0); // 5-4, not enough in deciding set
    expect(set.status).toBe('inProgress');
    
    manager.recordGoal(0); // 6-4, enough (2 ahead)
    expect(set.status).toBe('completed');
    expect(set.winner).toBe(0);
  });

  it('throws if completing set not from inProgress', () => {
    expect(() => manager.completeSet(0)).toThrow();
  });
});
