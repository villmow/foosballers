// Implements the match state machine for managing match lifecycle and transitions
import { IMatch } from './Match';

export type MatchState = 'notStarted' | 'inProgress' | 'completed' | 'aborted';

export class MatchStateMachine {
  private match: IMatch;

  constructor(match: IMatch) {
    this.match = match;
  }

  get state(): MatchState {
    return this.match.status;
  }

  startMatch(): void {
    if (this.match.status !== 'notStarted') {
      throw new Error('Match can only be started from notStarted state');
    }
    this.match.status = 'inProgress';
    this.match.startTime = new Date();
  }

  endMatch(): void {
    if (this.match.status !== 'inProgress') {
      throw new Error('Match can only be ended from inProgress state');
    }
    this.match.status = 'completed';
    this.match.endTime = new Date();
  }

  abortMatch(): void {
    if (this.match.status !== 'inProgress' && this.match.status !== 'notStarted') {
      throw new Error('Match can only be aborted from notStarted or inProgress state');
    }
    this.match.status = 'aborted';
    this.match.endTime = new Date();
  }

  // Add more transitions as needed
}
