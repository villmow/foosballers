import mongoose, { Document, Schema } from 'mongoose';

// Player subdocument schema
const PlayerSchema = new Schema({
  name: { type: String, required: true },
  playerId: { type: String, default: null }, // can be null
}, { _id: false });

// Team subdocument schema
const TeamSchema = new Schema({
  name: { type: String, required: true },
  color: { type: String, required: true },
  players: [{ type: PlayerSchema, required: true }],
  setsWon: { type: Number, default: 0 },
}, { _id: false });

export interface IMatch extends Document {
  teams: Array<{
    name: string;
    color: string;
    players: Array<{
      name: string;
      playerId: string | null;
    }>;
    setsWon: number;
  }>;
  
  status: 'notStarted' | 'inProgress' | 'completed' | 'aborted';
  startTime: Date;
  endTime: Date;
  createdBy: mongoose.Types.ObjectId;
  sets: mongoose.Types.ObjectId[];
  currentSet: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Add virtual properties
  duration?: number;
  winner?: number | null;
}

const MatchSchema = new Schema({
  // Instead of spreading ...MatchConfigurationSchema.obj, explicitly add the fields to avoid type issues
  numGoalsToWin: { type: Number, required: true, min: 1 },
  numSetsToWin: { type: Number, required: true, min: 1 },
  twoAhead: { type: Boolean, default: false },
  name: { type: String, required: false },
  draw: { type: Boolean, default: false },
  timeoutsPerSet: { type: Number, required: false, min: 0, max: 5, default: 2 },
  playerSetup: { type: String, enum: ['1v1', '2v2'], required: true },
  teams: {
    type: [TeamSchema],
    validate: [(v: any[]) => v.length === 2, 'There must be exactly 2 teams'],
    required: true,
  },
  status: {
    type: String,
    enum: ['notStarted', 'inProgress', 'completed', 'aborted'],
    default: 'notStarted',
    required: true,
    index: true,
  },
  startTime: { type: Date },
  endTime: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sets: [{ type: Schema.Types.ObjectId, ref: 'Set' }],
  currentSet: { type: Schema.Types.ObjectId, ref: 'Set' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for efficient queries
MatchSchema.index({ status: 1 });
MatchSchema.index({ 'teams.players': 1 });
MatchSchema.index({ startTime: -1 });
MatchSchema.index({ createdBy: 1 });

// Virtual for match duration
MatchSchema.virtual('duration').get(function (this: IMatch) {
  if (!this.startTime || !this.endTime) return null;
  return (this.endTime.getTime() - this.startTime.getTime()) / 1000; // seconds
});

// Virtual for winner (team index with most setsWon, only if match is completed)
MatchSchema.virtual('winner').get(function (this: IMatch) {
  if (this.status !== 'completed') return null;
  if (!this.teams || this.teams.length !== 2) return null;
  if (this.teams[0].setsWon === this.teams[1].setsWon) return null;
  return this.teams[0].setsWon > this.teams[1].setsWon ? 0 : 1;
});

// Update updatedAt on save
MatchSchema.pre('save', function (this: any, next) {
  this.updatedAt = new Date();
  next();
});

export const MatchModel = mongoose.model<IMatch>('Match', MatchSchema);
