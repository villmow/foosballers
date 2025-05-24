import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeout extends Document {
  matchId: mongoose.Types.ObjectId;
  setId: mongoose.Types.ObjectId;
  teamIndex: number;
  timestamp: Date;
  voided: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimeoutSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  setId: { type: Schema.Types.ObjectId, ref: 'Set', required: true },
  teamIndex: { type: Number, required: true, min: 0, max: 1 },
  timestamp: { type: Date, required: true },
  voided: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TimeoutSchema.index({ matchId: 1, setId: 1, timestamp: 1 });
TimeoutSchema.pre('save', function (this: any, next) {
  this.updatedAt = new Date();
  next();
});

// Note: Progression logic (set progression, timeout tracking) has been moved to GameProgressionService
// Controllers now explicitly call GameProgressionService methods instead of relying on hooks

export const TimeoutModel = mongoose.model<ITimeout>('Timeout', TimeoutSchema);
