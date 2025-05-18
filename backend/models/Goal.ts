import mongoose, { Document, Schema } from 'mongoose';

export interface IGoal extends Document {
  matchId: mongoose.Types.ObjectId;
  scorer: string;
  time: number;
}

const GoalSchema = new Schema<IGoal>({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  scorer: { type: String, required: true },
  time: { type: Number, required: true },
});

export const GoalModel = mongoose.model<IGoal>('Goal', GoalSchema);
