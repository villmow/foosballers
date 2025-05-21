import { MatchStateMachine } from './MatchStateMachine';

describe('MatchStateMachine', () => {
  let match: any;
  let machine: MatchStateMachine;

  beforeEach(() => {
    match = {
      status: 'notStarted',
      numGoalsToWin: 5,
      numSetsToWin: 2,
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
      draw: false,
      timeoutsPerSet: 2,
      name: 'Test',
      startTime: null,
      endTime: null,
      _id: 'matchid',
    };
    machine = new MatchStateMachine(match);
  });

  it('starts a match from notStarted', () => {
    machine.startMatch();
    expect(match.status).toBe('inProgress');
    expect(match.startTime).toBeInstanceOf(Date);
  });

  it('throws if starting match not from notStarted', () => {
    match.status = 'inProgress';
    expect(() => machine.startMatch()).toThrow();
  });

  it('ends a match from inProgress', () => {
    match.status = 'inProgress';
    machine.endMatch();
    expect(match.status).toBe('completed');
    expect(match.endTime).toBeInstanceOf(Date);
  });

  it('throws if ending match not from inProgress', () => {
    expect(() => machine.endMatch()).toThrow();
  });

  it('aborts a match from notStarted', () => {
    machine.abortMatch();
    expect(match.status).toBe('aborted');
    expect(match.endTime).toBeInstanceOf(Date);
  });

  it('aborts a match from inProgress', () => {
    match.status = 'inProgress';
    machine = new MatchStateMachine(match);
    machine.abortMatch();
    expect(match.status).toBe('aborted');
    expect(match.endTime).toBeInstanceOf(Date);
  });

  it('throws if aborting match from completed', () => {
    match.status = 'completed';
    expect(() => machine.abortMatch()).toThrow();
  });
});
