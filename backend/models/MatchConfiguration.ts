import { Schema } from 'mongoose';

export interface MatchConfiguration {
  // Number of points needed to win a set
  numGoalsToWin: number;
  // Number of sets needed to win a match
  numSetsToWin: number;
  // Boolean indicating whether a player must win by two points
  twoAhead: boolean;
  // The name of the match configuration (e.g., "Encounter 1", "Team 1 vs Team 1", "Single")
  name: string;
  // Boolean indicating whether matches can end in a draw
  draw: boolean;
  timeoutsPerSet: number;
  playerSetup: '1v1' | '2v2';
}

export const MatchConfigurationSchema = new Schema<MatchConfiguration>({
  numGoalsToWin: { type: Number, required: true, min: 1 },
  numSetsToWin: { type: Number, required: true, min: 1 },
  twoAhead: { type: Boolean, default: false },
  name: { type: String, required: false },
  draw: { type: Boolean, default: false },
  timeoutsPerSet: { type: Number, required: false, min: 0, max: 5, default: 2 },
  playerSetup: { type: String, enum: ['1v1', '2v2'], required: true },
}, { _id: false });
