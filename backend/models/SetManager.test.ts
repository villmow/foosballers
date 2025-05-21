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

  it('enforces two-ahead rule if enabled', () => {
    match.twoAhead = true;
    manager.startSet();
    set.scores = [4, 4];
    manager.recordGoal(0); // 5-4, not enough
    expect(set.status).toBe('inProgress');
    set.scores = [6, 4];
    manager.checkWinningCondition();
    expect(set.status).toBe('completed');
    expect(set.winner).toBe(0);
  });

  it('throws if completing set not from inProgress', () => {
    expect(() => manager.completeSet(0)).toThrow();
  });
});
