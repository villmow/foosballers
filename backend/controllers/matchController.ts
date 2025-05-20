import { Request, Response } from 'express';
import { MatchModel } from '../models/Match';

// Create a new match
export const createMatch = async (req: Request, res: Response) => {
  try {
    const match = new MatchModel(req.body);
    await match.save();
    res.status(201).json(match);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Get a match by ID
export const getMatch = async (req: Request, res: Response) => {
  try {
    const match = await MatchModel.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Update a match by ID
export const updateMatch = async (req: Request, res: Response) => {
  try {
    const match = await MatchModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Delete a match by ID
export const deleteMatch = async (req: Request, res: Response) => {
  try {
    const match = await MatchModel.findByIdAndDelete(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json({ message: 'Match deleted' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};
