import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  createdAt: Date;
}

const TeamSchema = new Schema<ITeam>({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export const TeamModel = mongoose.model<ITeam>('Team', TeamSchema);
