import mongoose, { Document, Schema } from 'mongoose';

export interface ISet extends Document {
  matchId: mongoose.Types.ObjectId;
  setNumber: number;
  scores: [number, number];
  timeoutsUsed: [number, number];
  goals: mongoose.Types.ObjectId[];
  timeouts: mongoose.Types.ObjectId[];
  startTime: Date;
  endTime: Date;
  status: 'notStarted' | 'inProgress' | 'completed';
  winner: number;
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

// Post-save hook to update parent Match setsWon when set is completed
SetSchema.post('save', async function (doc) {
  if (doc.status === 'completed' && typeof doc.winner === 'number') {
    const MatchModel = require('./Match').MatchModel;
    const SetModel = require('./Set').SetModel;
    const match = await MatchModel.findById(doc.matchId);
    if (match && match.teams && match.teams.length === 2) {
      // Skip processing if match is already completed
      if (match.status === 'completed') {
        return;
      }
      
      // Only increment if not already counted
      if (match.teams[doc.winner].setsWon < match.numSetsToWin) {
        match.teams[doc.winner].setsWon += 1;
        await match.save();
      }
      // Automatic set progression logic
      // Count sets won for each team (fix implicit any)
      const setsWon = match.teams.map((t: any) => t.setsWon);
      const maxSets = Math.max(...setsWon);
      if (maxSets >= match.numSetsToWin) {
        // End match if winning condition met
        match.status = 'completed';
        match.endTime = new Date();
        await match.save();
      } else {
        // Start new set automatically - use database query to get correct set number
        const existingSets = await SetModel.find({ matchId: match._id }).sort({ setNumber: -1 }).limit(1);
        const nextSetNumber = existingSets.length > 0 ? existingSets[0].setNumber + 1 : 1;
        
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
          match.sets.push(newSet._id);
          match.currentSet = newSet._id;
          await match.save();
        }
      }
    }
  }
});

export const SetModel = mongoose.model<ISet>('Set', SetSchema);
