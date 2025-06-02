import { Server } from 'socket.io';
import { IGoal } from '../models/Goal';
import { IMatch } from '../models/Match';
import { ISet } from '../models/Set';
import { ITimeout } from '../models/Timeout';
import { GoalEvent, MatchEvent, SetEvent, TimeoutEvent, ViewChangeEvent } from '../shared-types';
import { ProgressionResult } from './gameProgressionService';
import { ScoreboardService } from './scoreboardService';

export class ScoreboardBroadcastService {
  private static io: Server | null = null;

  /**
   * Initialize the broadcast service with Socket.io instance
   */
  static initialize(io: Server): void {
    this.io = io;
  }

  /**
   * Broadcast goal event to all scoreboard viewers of a match
   */
  static async broadcastGoal(goal: IGoal, progressionResult: ProgressionResult): Promise<void> {
    if (!this.io) return;

    const matchId = goal.matchId.toString();
    const matchRoom = `match:${matchId}`;

    // Create goal event
    const goalEvent: GoalEvent = {
      matchId,
      setId: goal.setId.toString(),
      teamIndex: goal.teamIndex,
      goalId: (goal._id as any).toString(),
      timestamp: goal.timestamp,
      scoringRow: goal.scoringRow,
      newScore: progressionResult.set?.scores || [0, 0]
    };

    // Broadcast goal event
    this.io.to(matchRoom).emit('scoreboard:goal', goalEvent);

    // If set was completed, broadcast set update
    if (progressionResult.setCompleted && progressionResult.set) {
      await this.broadcastSetUpdate(progressionResult.set, progressionResult.newSetCreated);
    }

    // If match was completed, broadcast match update
    if (progressionResult.matchCompleted && progressionResult.match) {
      await this.broadcastMatchUpdate(progressionResult.match);
    }

    // Always broadcast updated scoreboard data
    await this.broadcastScoreboardData(matchId);

    console.log(`Broadcasted goal event for match ${matchId}, team ${goal.teamIndex}`);
  }

  /**
   * Broadcast timeout event to all scoreboard viewers of a match
   */
  static async broadcastTimeout(timeout: ITimeout, progressionResult: ProgressionResult): Promise<void> {
    if (!this.io) return;

    const matchId = timeout.matchId.toString();
    const matchRoom = `match:${matchId}`;

    // Create timeout event
    const timeoutEvent: TimeoutEvent = {
      matchId,
      setId: timeout.setId.toString(),
      teamIndex: timeout.teamIndex,
      timeoutId: (timeout._id as any).toString(),
      timestamp: timeout.timestamp,
      timeoutsRemaining: progressionResult.set?.timeoutsUsed ? [
        (progressionResult.match?.timeoutsPerSet || 2) - progressionResult.set.timeoutsUsed[0],
        (progressionResult.match?.timeoutsPerSet || 2) - progressionResult.set.timeoutsUsed[1]
      ] : [2, 2]
    };

    // Broadcast timeout event
    this.io.to(matchRoom).emit('scoreboard:timeout', timeoutEvent);

    // Always broadcast updated scoreboard data
    await this.broadcastScoreboardData(matchId);

    console.log(`Broadcasted timeout event for match ${matchId}, team ${timeout.teamIndex}`);
  }

  /**
   * Broadcast set update to all scoreboard viewers of a match
   */
  static async broadcastSetUpdate(set: ISet, newSetCreated: boolean = false): Promise<void> {
    if (!this.io) return;

    const matchId = set.matchId.toString();
    const matchRoom = `match:${matchId}`;

    // Create set event
    const setEvent: SetEvent = {
      matchId,
      setId: (set._id as any).toString(),
      setNumber: set.setNumber,
      status: set.status,
      scores: set.scores,
      winner: set.winner,
      newSetCreated
    };

    // Broadcast set event
    this.io.to(matchRoom).emit('scoreboard:set_update', setEvent);

    console.log(`Broadcasted set update for match ${matchId}, set ${set.setNumber}, status: ${set.status}`);
  }

  /**
   * Broadcast match update to all scoreboard viewers of a match
   */
  static async broadcastMatchUpdate(match: IMatch): Promise<void> {
    if (!this.io) return;

    const matchId = (match._id as any).toString();
    const matchRoom = `match:${matchId}`;

    // Create match event
    const matchEvent: MatchEvent = {
      matchId,
      status: match.status,
      winner: match.winner !== null ? match.winner : undefined,
      setsWon: [match.teams[0].setsWon, match.teams[1].setsWon]
    };

    // Broadcast match event
    this.io.to(matchRoom).emit('scoreboard:match_update', matchEvent);

    console.log(`Broadcasted match update for match ${matchId}, status: ${match.status}`);
  }

  /**
   * Broadcast view change to all scoreboard viewers of a match
   */
  static async broadcastViewChange(viewChangeEvent: ViewChangeEvent): Promise<void> {
    if (!this.io) return;

    const matchRoom = `match:${viewChangeEvent.matchId}`;

    // Broadcast view change event
    this.io.to(matchRoom).emit('scoreboard:view_change', viewChangeEvent);

    console.log(`Broadcasted view change for match ${viewChangeEvent.matchId}: ${viewChangeEvent.view}`);
  }

  /**
   * Broadcast complete scoreboard data to all viewers of a match
   */
  static async broadcastScoreboardData(matchId: string): Promise<void> {
    if (!this.io) return;

    const matchRoom = `match:${matchId}`;

    // Get all active sessions for this match
    const sessions = ScoreboardService.getMatchSessions(matchId);

    // Broadcast updated data to each session (may have different views)
    for (const session of sessions) {
      const scoreboardData = await ScoreboardService.generateScoreboardData(matchId, session.sessionId);
      if (scoreboardData) {
        const sessionRoom = `session:${session.sessionId}`;
        this.io.to(sessionRoom).emit('scoreboard:data', scoreboardData);
      }
    }

    // Also broadcast generic data to the match room for any non-session clients
    const genericData = await ScoreboardService.generateScoreboardData(matchId);
    if (genericData) {
      this.io.to(matchRoom).emit('scoreboard:data', genericData);
    }

    console.log(`Broadcasted scoreboard data for match ${matchId} to ${sessions.length} sessions`);
  }

  /**
   * Broadcast error to specific socket or match room
   */
  static broadcastError(target: string, error: { message: string; code: string }, toRoom: boolean = false): void {
    if (!this.io) return;

    if (toRoom) {
      this.io.to(target).emit('scoreboard:error', error);
    } else {
      this.io.to(target).emit('scoreboard:error', error);
    }
  }

  /**
   * Get number of connected clients in a match room
   */
  static async getMatchViewerCount(matchId: string): Promise<number> {
    if (!this.io) return 0;

    const matchRoom = `match:${matchId}`;
    const sockets = await this.io.in(matchRoom).fetchSockets();
    return sockets.length;
  }
}
