import mongoose, { Document, Schema } from 'mongoose';

export interface IGoal extends Document {
  matchId: mongoose.Types.ObjectId;
  setId: mongoose.Types.ObjectId;
  teamIndex: number;
  timestamp: Date;
  scoringRow?: 'goalie' | '2-bar' | '5-bar' | '3-bar';
  voided: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true},
  setId: { type: Schema.Types.ObjectId, ref: 'Set', required: true },
  teamIndex: { type: Number, required: true, min: 0, max: 1 },
  timestamp: { type: Date, required: true },
  scoringRow: { type: String, enum: ['goalie', '2-bar', '5-bar', '3-bar'] },
  voided: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

GoalSchema.index({ matchId: 1, setId: 1, timestamp: 1 });
GoalSchema.pre('save', function (this: any, next) {
  this.updatedAt = new Date();
  next();
});

// Post-save hook to update parent Set's scores and goals array
GoalSchema.post('save', async function (doc) {
  const SetModel = require('./Set').SetModel;
  const MatchModel = require('./Match').MatchModel;
  const set = await SetModel.findById(doc.setId);
  if (!set) return;
  
  // Always recalculate scores and goals based on non-voided goals
  const GoalModel = require('./Goal').GoalModel;
  const allGoals = await GoalModel.find({ setId: doc.setId, voided: false }).sort({ timestamp: 1 });
  
  // Reset scores and goals array
  set.scores = [0, 0];
  set.goals = [];
  
  // Recalculate from all non-voided goals
  for (const goal of allGoals) {
    set.scores[goal.teamIndex] = (set.scores[goal.teamIndex] || 0) + 1;
    set.goals.push(goal._id);
  }
  
  // Check for set winning condition after updating score
  const match = await MatchModel.findById(doc.matchId);
  if (match) {
    const goalsToWin = match.numGoalsToWin;
    const twoAhead = match.twoAhead;
    const [score0, score1] = set.scores;
    const maxScore = Math.max(score0, score1);
    const minScore = Math.min(score0, score1);
    
    if (set.status === 'inProgress' || set.status === 'notStarted') {
      // Check if winning condition is met for sets in progress or not started
      if (maxScore >= goalsToWin && (!twoAhead || maxScore - minScore >= 2)) {
        const winner = score0 > score1 ? 0 : 1;
        set.status = 'completed';
        set.endTime = new Date();
        set.winner = winner;
        // The Set's post-save hook will handle match progression
      } else if (set.status === 'notStarted' && (score0 > 0 || score1 > 0)) {
        // Start the set if it's not started and has goals
        set.status = 'inProgress';
        set.startTime = new Date();
      }
    } else if (set.status === 'completed') {
      // Check if we should revert to inProgress for two-ahead rule scenarios
      if (match && match.twoAhead && !doc.voided) {
        const goalsToWin = match.numGoalsToWin;
        const [score0, score1] = set.scores;
        const maxScore = Math.max(score0, score1);
        const minScore = Math.min(score0, score1);
        
        // For two-ahead rule, revert if the lead is reduced below 2
        // but only if both teams have reached a reasonable score threshold
        if (maxScore >= goalsToWin && maxScore - minScore < 2) {
          set.status = 'inProgress';
          set.endTime = undefined;
          set.winner = undefined;
        }
      } else if (doc.voided && match) {
        // Revert to inProgress if a goal was voided and conditions are no longer met
        const goalsToWin = match.numGoalsToWin;
        const twoAhead = match.twoAhead;
        const [score0, score1] = set.scores;
        const maxScore = Math.max(score0, score1);
        const minScore = Math.min(score0, score1);
        
        if (maxScore < goalsToWin || (twoAhead && maxScore - minScore < 2)) {
          set.status = 'inProgress';
          set.endTime = undefined;
          set.winner = undefined;
        }
      }
    }
  }
  
  await set.save();
});

// Post-update hook to handle voiding/unvoiding
GoalSchema.post('findOneAndUpdate', async function (doc) {
  if (!doc) return;
  const SetModel = require('./Set').SetModel;
  const MatchModel = require('./Match').MatchModel;
  const set = await SetModel.findById(doc.setId);
  if (!set) return;
  
  // Recalculate score based on non-voided goals
  const GoalModel = require('./Goal').GoalModel;
  const goals = await GoalModel.find({ setId: doc.setId, voided: false });
  set.scores = [0, 0];
  set.goals = [];
  for (const goal of goals) {
    set.scores[goal.teamIndex] = (set.scores[goal.teamIndex] || 0) + 1;
    set.goals.push(goal._id);
  }
  
  // Check for set winning condition after recalculating scores
  const match = await MatchModel.findById(doc.matchId);
  if (match) {
    const goalsToWin = match.numGoalsToWin;
    const twoAhead = match.twoAhead;
    const [score0, score1] = set.scores;
    const maxScore = Math.max(score0, score1);
    const minScore = Math.min(score0, score1);
    
    // Determine if set should be completed or reverted to inProgress
    if (maxScore >= goalsToWin && (!twoAhead || maxScore - minScore >= 2)) {
      if (set.status !== 'completed') {
        const winner = score0 > score1 ? 0 : 1;
        set.status = 'completed';
        set.endTime = new Date();
        set.winner = winner;
      }
    } else {
      // Revert to inProgress if winning condition is no longer met
      if (set.status === 'completed') {
        set.status = 'inProgress';
        set.endTime = undefined;
        set.winner = undefined;
      }
    }
  }
  
  await set.save();
});

export const GoalModel = mongoose.model<IGoal>('Goal', GoalSchema);
