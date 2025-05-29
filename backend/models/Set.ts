import mongoose, { Document, Schema } from 'mongoose';

export interface ISet extends Document {
  matchId: mongoose.Types.ObjectId;
  setNumber: number;
  scores: [number, number];
  timeoutsUsed: [number, number];
  goals: mongoose.Types.ObjectId[];
  timeouts: mongoose.Types.ObjectId[];
  startTime: Date;
  endTime?: Date;
  status: 'notStarted' | 'inProgress' | 'completed';
  winner?: number;
  teamColors: [string, string]; // [team0Color, team1Color]
  createdAt: Date;
  updatedAt: Date;
}

const SetSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true},
  setNumber: { type: Number, required: true },
  scores: { type: [Number], required: true, validate: [(v: number[]) => v.length === 2, 'Scores must be an array of two numbers'] },
  timeoutsUsed: { type: [Number], required: true, default: [0, 0], validate: [(v: number[]) => v.length === 2, 'TimeoutsUsed must be an array of two numbers'] },
  goals: [{ type: Schema.Types.ObjectId, ref: 'Goal' }],
  timeouts: [{ type: Schema.Types.ObjectId, ref: 'Timeout' }],
  startTime: { type: Date },
  endTime: { type: Date },
  status: { type: String, enum: ['notStarted', 'inProgress', 'completed'], default: 'notStarted', required: true },
  winner: { type: Number, min: 0, max: 1 },
  teamColors: { type: [String], required: true, validate: [(v: string[]) => v.length === 2, 'TeamColors must be an array of two color strings'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Virtual for set duration
SetSchema.virtual('duration').get(function (this: ISet) {
  if (!this.startTime || !this.endTime) return null;
  return (this.endTime.getTime() - this.startTime.getTime()) / 1000; // seconds
});

// Virtual for current score (alias for scores)
SetSchema.virtual('currentScore').get(function (this: ISet) {
  return this.scores;
});

// Index for status for efficient querying
SetSchema.index({ matchId: 1, status: 1 });

SetSchema.index({ matchId: 1, setNumber: 1 }, { unique: true });
SetSchema.pre('save', function (this: any, next) {
  this.updatedAt = new Date();
  // Automatically compute winner if set is completed and not already set
  if (this.status === 'completed' && typeof this.winner !== 'number' && Array.isArray(this.scores) && this.scores.length === 2) {
    if (this.scores[0] > this.scores[1]) {
      this.winner = 0;
    } else if (this.scores[1] > this.scores[0]) {
      this.winner = 1;
    } else {
      this.winner = null; // Draw or error, if allowed
    }
  }
  next();
});

// Note: Progression logic (match progression, automatic set creation) has been moved to GameProgressionService
// Controllers now explicitly call GameProgressionService methods instead of relying on hooks

export const SetModel = mongoose.model<ISet>('Set', SetSchema);
