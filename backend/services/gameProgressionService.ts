import mongoose from 'mongoose';
import { IGoal } from '../models/Goal';
import { IMatch, MatchModel } from '../models/Match';
import { MatchStateMachine } from '../models/MatchStateMachine';
import { ISet, SetModel } from '../models/Set';
import { ITimeout } from '../models/Timeout';

export interface ProgressionResult {
  set: ISet | null;
  match: IMatch | null;
  setCompleted?: boolean;
  matchCompleted?: boolean;
  newSetCreated?: boolean;
}

export class GameProgressionService {
  /**
   * Handle goal-related progression: update scores, check for set completion, and match progression
   */
  async processGoalProgression(goal: IGoal): Promise<ProgressionResult> {
    const set = await SetModel.findById(goal.setId);
    if (!set) throw new Error('Set not found');

    const match = await MatchModel.findById(goal.matchId);
    if (!match) throw new Error('Match not found');

    // Recalculate scores based on all non-voided goals
    await this.recalculateSetScores(set);

    // Check if set should start (if not already started)
    if (set.status === 'notStarted') {
      set.status = 'inProgress';
      set.startTime = new Date();
    }

    // Check for set completion
    const setCompleted = await this.checkAndCompleteSet(set, match);
    let matchCompleted = false;
    let newSetCreated = false;

    if (setCompleted) {
      // Save the set first so it appears in the completed sets query
      await set.save();
      
      // Update match setsWon and check for match completion
      const result = await this.processSetCompletion(set, match);
      matchCompleted = result.matchCompleted;
      newSetCreated = result.newSetCreated;
    } else {
      await set.save();
    }

    await match.save();

    return {
      set: await SetModel.findById(set._id).populate('matchId'),
      match: await MatchModel.findById(match._id),
      setCompleted,
      matchCompleted,
      newSetCreated
    };
  }

  /**
   * Handle timeout-related progression: update timeout counts and potentially start sets
   */
  async processTimeoutProgression(timeout: ITimeout): Promise<ProgressionResult> {
    const set = await SetModel.findById(timeout.setId);
    if (!set) throw new Error('Set not found');

    const match = await MatchModel.findById(timeout.matchId);
    if (!match) throw new Error('Match not found');

    // Recalculate timeout usage
    await this.recalculateSetTimeouts(set);

    // Check if set should start (if not already started and has timeouts)
    if (set.status === 'notStarted' && set.timeouts.length > 0) {
      set.status = 'inProgress';
      set.startTime = new Date();
    }

    await set.save();

    return {
      set: await SetModel.findById(set._id).populate('matchId'),
      match: await MatchModel.findById(match._id),
      setCompleted: false,
      matchCompleted: false,
      newSetCreated: false
    };
  }

  /**
   * Handle set completion manually triggered by API
   */
  async processManualSetCompletion(setId: string, winner: number): Promise<ProgressionResult> {
    const set = await SetModel.findById(setId);
    if (!set) throw new Error('Set not found');

    const match = await MatchModel.findById(set.matchId);
    if (!match) throw new Error('Match not found');

    if (set.status !== 'inProgress') {
      throw new Error('Set must be in progress to complete');
    }

    if (typeof winner !== 'number' || (winner !== 0 && winner !== 1)) {
      throw new Error('Winner must be 0 or 1');
    }

    // Complete the set
    set.status = 'completed';
    set.endTime = new Date();
    set.winner = winner;
    
    // Save the set first so it appears in the processSetCompletion query
    await set.save();

    // Process set completion
    const result = await this.processSetCompletion(set, match);

    await match.save();

    return {
      set: await SetModel.findById(set._id).populate('matchId'),
      match: await MatchModel.findById(match._id),
      setCompleted: true,
      matchCompleted: result.matchCompleted,
      newSetCreated: result.newSetCreated
    };
  }

  /**
   * Recalculate set scores based on non-voided goals
   */
  private async recalculateSetScores(set: ISet): Promise<void> {
    const { GoalModel } = require('../models/Goal');
    const allGoals = await GoalModel.find({ setId: set._id, voided: false }).sort({ timestamp: 1 });

    // Reset scores and goals array
    set.scores = [0, 0];
    set.goals = [];

    // Recalculate from all non-voided goals
    for (const goal of allGoals) {
      set.scores[goal.teamIndex] = (set.scores[goal.teamIndex] || 0) + 1;
      set.goals.push(goal._id);
    }
  }

  /**
   * Recalculate set timeouts based on non-voided timeouts
   */
  private async recalculateSetTimeouts(set: ISet): Promise<void> {
    const { TimeoutModel } = require('../models/Timeout');
    const allTimeouts = await TimeoutModel.find({ setId: set._id, voided: false }).sort({ timestamp: 1 });

    // Reset timeoutsUsed and timeouts array
    set.timeoutsUsed = [0, 0];
    set.timeouts = [];

    // Recalculate from all non-voided timeouts
    for (const timeout of allTimeouts) {
      set.timeoutsUsed[timeout.teamIndex] = (set.timeoutsUsed[timeout.teamIndex] || 0) + 1;
      set.timeouts.push(timeout._id);
    }
  }

  /**
   * Check if set should be completed based on scores and match rules
   */
  private async checkAndCompleteSet(set: ISet, match: IMatch): Promise<boolean> {
    if (set.status !== 'inProgress') return false;

    const goalsToWin = match.numGoalsToWin;
    const twoAhead = match.twoAhead;
    const twoAheadUpUntil = match.twoAheadUpUntil || 8; // Default to 8 if not set
    const [score0, score1] = set.scores;
    const maxScore = Math.max(score0, score1);
    const minScore = Math.min(score0, score1);

    // Check if this is the final deciding set (both teams have numSetsToWin - 1 sets won)
    const isDecidingSet = match.teams[0].setsWon === (match.numSetsToWin - 1) && 
                         match.teams[1].setsWon === (match.numSetsToWin - 1);
    
    // Only apply twoAhead rule in the deciding set and when score hasn't exceeded twoAheadUpUntil
    const shouldApplyTwoAhead = twoAhead && isDecidingSet && maxScore < twoAheadUpUntil;

    // Check if winning condition is met
    if (maxScore >= goalsToWin && (!shouldApplyTwoAhead || maxScore - minScore >= 2)) {
      const winner = score0 > score1 ? 0 : 1;
      set.status = 'completed';
      set.endTime = new Date();
      set.winner = winner;
      return true;
    }

    return false;
  }

  /**
   * Process set completion: update match setsWon, check for match completion, create new set if needed
   */
  private async processSetCompletion(set: ISet, match: IMatch): Promise<{ matchCompleted: boolean; newSetCreated: boolean }> {
    // Count completed sets to ensure setsWon is accurate
    const completedSets = await SetModel.find({ 
      matchId: match._id, 
      status: 'completed',
      winner: { $exists: true, $ne: null, $type: 'number' }
    });

    // Reset and recalculate setsWon based on completed sets
    match.teams[0].setsWon = 0;
    match.teams[1].setsWon = 0;

    for (const completedSet of completedSets) {
      if (typeof completedSet.winner === 'number' && completedSet.winner >= 0 && completedSet.winner <= 1) {
        match.teams[completedSet.winner].setsWon += 1;
      }
    }

    // Check if match should be completed
    const setsWon = match.teams.map(t => t.setsWon);
    const maxSets = Math.max(...setsWon);
    
    if (maxSets >= match.numSetsToWin) {
      // End match if winning condition met
      const stateMachine = new MatchStateMachine(match);
      stateMachine.endMatch();
      return { matchCompleted: true, newSetCreated: false };
    } else {
      // If match was previously completed but no longer meets the winning condition, revert it to inProgress
      if (match.status === 'completed') {
        // Reset to inProgress since winning condition is no longer met
        match.status = 'inProgress';
        (match as any).endTime = undefined;
      }

      // Create new set automatically - next set number is current set + 1
      const nextSetNumber = set.setNumber + 1;

      // Check if a set with this number already exists to prevent duplicates
      const existingSet = await SetModel.findOne({ matchId: match._id, setNumber: nextSetNumber });
      if (!existingSet) {
        const newSet = new SetModel({
          matchId: match._id,
          setNumber: nextSetNumber,
          scores: [0, 0],
          timeoutsUsed: [0, 0],
          status: 'notStarted',
        });
        await newSet.save();
        match.sets.push(newSet._id as mongoose.Types.ObjectId);
        match.currentSet = newSet._id as mongoose.Types.ObjectId;
        return { matchCompleted: false, newSetCreated: true };
      }
    }

    return { matchCompleted: false, newSetCreated: false };
  }

  /**
   * Handle voiding/unvoiding of goals - recalculate and potentially revert set status
   */
  async processGoalVoidingProgression(goal: IGoal): Promise<ProgressionResult> {
    const set = await SetModel.findById(goal.setId);
    if (!set) throw new Error('Set not found');

    const match = await MatchModel.findById(goal.matchId);
    if (!match) throw new Error('Match not found');

    // Recalculate scores
    await this.recalculateSetScores(set);

    // Check if set status should change based on new scores
    const goalsToWin = match.numGoalsToWin;
    const twoAhead = match.twoAhead;
    const twoAheadUpUntil = match.twoAheadUpUntil || 8; // Default to 8 if not set
    const [score0, score1] = set.scores;
    const maxScore = Math.max(score0, score1);
    const minScore = Math.min(score0, score1);

    // Check if this is the final deciding set (both teams have numSetsToWin - 1 sets won)
    const isDecidingSet = match.teams[0].setsWon === (match.numSetsToWin - 1) && 
                         match.teams[1].setsWon === (match.numSetsToWin - 1);
    
    // Only apply twoAhead rule in the deciding set and when score hasn't exceeded twoAheadUpUntil
    const shouldApplyTwoAhead = twoAhead && isDecidingSet && maxScore < twoAheadUpUntil;

    let setCompleted = false;
    let setStatusChanged = false;

    if (set.status === 'completed') {
      // Check if we should revert to inProgress
      if (maxScore < goalsToWin || (shouldApplyTwoAhead && maxScore - minScore < 2)) {
        set.status = 'inProgress';
        set.endTime = undefined;
        set.winner = undefined;
        setStatusChanged = true;
      }
    } else if (set.status === 'inProgress') {
      // Check if we should complete the set
      if (maxScore >= goalsToWin && (!shouldApplyTwoAhead || maxScore - minScore >= 2)) {
        const winner = score0 > score1 ? 0 : 1;
        set.status = 'completed';
        set.endTime = new Date();
        set.winner = winner;
        setCompleted = true;
        setStatusChanged = true;
      }
    }

    let matchCompleted = false;
    let newSetCreated = false;

    // If set status changed, recalculate match setsWon
    if (setStatusChanged) {
      await set.save(); // Save the set first so it appears correctly in the query
      
      // Count completed sets to ensure setsWon is accurate
      const completedSets = await SetModel.find({ 
        matchId: match._id, 
        status: 'completed',
        winner: { $exists: true, $ne: null, $type: 'number' }
      });

      // Reset and recalculate setsWon based on completed sets
      match.teams[0].setsWon = 0;
      match.teams[1].setsWon = 0;

      for (const completedSet of completedSets) {
        if (typeof completedSet.winner === 'number' && completedSet.winner >= 0 && completedSet.winner <= 1) {
          match.teams[completedSet.winner].setsWon += 1;
        }
      }

      // Check if match status should change based on new setsWon
      const setsWon = match.teams.map(t => t.setsWon);
      const maxSets = Math.max(...setsWon);

      if (setCompleted) {
        // If we just completed a set, check for match completion and new set creation
        const result = await this.processSetCompletion(set, match);
        matchCompleted = result.matchCompleted;
        newSetCreated = result.newSetCreated;
      } else if (match.status === 'completed' && maxSets < match.numSetsToWin) {
        // If match was completed but no longer meets winning condition, revert to inProgress
        match.status = 'inProgress';
        (match as any).endTime = undefined;
      }
    } else {
      await set.save();
    }

    await match.save();

    return {
      set: await SetModel.findById(set._id).populate('matchId'),
      match: await MatchModel.findById(match._id),
      setCompleted,
      matchCompleted,
      newSetCreated
    };
  }

  /**
   * Handle voiding/unvoiding of timeouts
   */
  async processTimeoutVoidingProgression(timeout: ITimeout): Promise<ProgressionResult> {
    const set = await SetModel.findById(timeout.setId);
    if (!set) throw new Error('Set not found');

    const match = await MatchModel.findById(timeout.matchId);
    if (!match) throw new Error('Match not found');

    // Recalculate timeout usage
    await this.recalculateSetTimeouts(set);

    await set.save();

    return {
      set: await SetModel.findById(set._id).populate('matchId'),
      match: await MatchModel.findById(match._id),
      setCompleted: false,
      matchCompleted: false,
      newSetCreated: false
    };
  }
}
