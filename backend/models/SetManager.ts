// Implements the set lifecycle management for foosball matches
import { IMatch } from './Match';
import { ISet } from './Set';

export type SetState = 'notStarted' | 'inProgress' | 'completed';

export class SetManager {
  private set: ISet;
  private match: IMatch;

  constructor(set: ISet, match: IMatch) {
    this.set = set;
    this.match = match;
  }

  get state(): SetState {
    return this.set.status;
  }

  startSet(): void {
    if (this.set.status !== 'notStarted') {
      throw new Error('Set can only be started from notStarted state');
    }
    if (this.match.status !== 'inProgress') {
      throw new Error('Set can only be started when match is in progress');
    }
    this.set.status = 'inProgress';
    this.set.startTime = new Date();
  }

  recordGoal(teamIndex: 0 | 1): void {
    if (this.set.status !== 'inProgress') {
      throw new Error('Can only record goals when set is in progress');
    }
    this.set.scores[teamIndex] += 1;
    this.checkWinningCondition();
  }

  checkWinningCondition(): void {
    const goalsToWin = this.match.numGoalsToWin;
    const twoAhead = this.match.twoAhead;
    const [score0, score1] = this.set.scores;
    const maxScore = Math.max(score0, score1);
    const minScore = Math.min(score0, score1);
    if (
      maxScore >= goalsToWin &&
      (!twoAhead || maxScore - minScore >= 2)
    ) {
      this.completeSet(score0 > score1 ? 0 : 1);
    }
  }

  completeSet(winner: 0 | 1): void {
    if (this.set.status !== 'inProgress') {
      throw new Error('Set can only be completed from inProgress state');
    }
    this.set.status = 'completed';
    this.set.endTime = new Date();
    this.set.winner = winner;
  }
}
