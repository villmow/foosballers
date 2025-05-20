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
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
  setId: { type: Schema.Types.ObjectId, ref: 'Set', required: true, index: true },
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
  const set = await SetModel.findById(doc.setId);
  if (!set) return;
  // Only update if not voided
  if (!doc.voided) {
    set.scores[doc.teamIndex] = (set.scores[doc.teamIndex] || 0) + 1;
    if (!set.goals.includes(doc._id)) {
      set.goals.push(doc._id);
    }
  } else {
    // If voided, decrement score and remove from goals array
    set.scores[doc.teamIndex] = Math.max(0, (set.scores[doc.teamIndex] || 0) - 1);
  }
  await set.save();
});

// Post-update hook to handle voiding/unvoiding
GoalSchema.post('findOneAndUpdate', async function (doc) {
  if (!doc) return;
  const SetModel = require('./Set').SetModel;
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
  await set.save();
});

export const GoalModel = mongoose.model<IGoal>('Goal', GoalSchema);
