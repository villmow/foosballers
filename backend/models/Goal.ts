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

// Note: Progression logic has been moved to GameProgressionService
// This ensures explicit control and better testability

export const GoalModel = mongoose.model<IGoal>('Goal', GoalSchema);
