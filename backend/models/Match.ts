import mongoose, { Document, Schema } from 'mongoose';

export interface IMatch extends Document {
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  status: string;
}

const MatchSchema = new Schema<IMatch>({
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  startTime: { type: Date, required: true },
  status: { type: String, default: 'scheduled' },
});

export const MatchModel = mongoose.model<IMatch>('Match', MatchSchema);
