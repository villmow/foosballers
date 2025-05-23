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

// Post-save hook to update parent Set's timeoutsUsed and timeouts array
TimeoutSchema.post('save', async function (doc) {
  const SetModel = require('./Set').SetModel;
  const MatchModel = require('./Match').MatchModel;
  
  const set = await SetModel.findById(doc.setId);
  if (!set) return;
  
  // Always recalculate timeoutsUsed and timeouts based on non-voided timeouts
  const TimeoutModel = require('./Timeout').TimeoutModel;
  const allTimeouts = await TimeoutModel.find({ setId: doc.setId, voided: false }).sort({ timestamp: 1 });
  
  // Reset timeoutsUsed and timeouts array
  set.timeoutsUsed = [0, 0];
  set.timeouts = [];
  
  // Recalculate from all non-voided timeouts
  for (const timeout of allTimeouts) {
    set.timeoutsUsed[timeout.teamIndex] = (set.timeoutsUsed[timeout.teamIndex] || 0) + 1;
    set.timeouts.push(timeout._id);
  }
  
  // Check for automatic set progression (start set if not started and has timeouts)
  if (set.status === 'notStarted' && set.timeouts.length > 0) {
    set.status = 'inProgress';
    set.startTime = new Date();
  }
  
  await set.save();
});

// Post-update hook to handle voiding/unvoiding
TimeoutSchema.post('findOneAndUpdate', async function (doc) {
  if (!doc) return;
  const SetModel = require('./Set').SetModel;
  const set = await SetModel.findById(doc.setId);
  if (!set) return;
  
  // Recalculate timeoutsUsed based on non-voided timeouts
  const TimeoutModel = require('./Timeout').TimeoutModel;
  const timeouts = await TimeoutModel.find({ setId: doc.setId, voided: false }).sort({ timestamp: 1 });
  
  set.timeoutsUsed = [0, 0];
  set.timeouts = [];
  
  for (const timeout of timeouts) {
    set.timeoutsUsed[timeout.teamIndex] = (set.timeoutsUsed[timeout.teamIndex] || 0) + 1;
    set.timeouts.push(timeout._id);
  }
  
  await set.save();
});

export const TimeoutModel = mongoose.model<ITimeout>('Timeout', TimeoutSchema);
