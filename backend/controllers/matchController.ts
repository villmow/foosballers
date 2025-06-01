import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import { MatchModel } from '../models/Match';
import { MatchStateMachine } from '../models/MatchStateMachine';
import { SetModel } from '../models/Set';

// Create a new match
export const createMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = new MatchModel(req.body);
    await match.save();
    res.status(201).json(match);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Get a match by ID
export const getMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await MatchModel.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    res.json(match);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Update a match by ID
export const updateMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await MatchModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    res.json(match);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Delete a match by ID
export const deleteMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await MatchModel.findByIdAndDelete(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    res.json({ message: 'Match deleted' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Start a match
export const startMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await MatchModel.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    
    const machine = new MatchStateMachine(match);
    machine.startMatch();
    await match.save();
    
    // Only create first set if no sets exist
    if (match.sets.length === 0) {
      const set = new SetModel({
        matchId: match._id,
        setNumber: 1,
        scores: [0, 0],
        timeoutsUsed: [0, 0],
        status: 'notStarted',
        teamColors: ['#65bc7b', '#000000'], // Default green and black for first set
      });
      await set.save();
      match.sets.push(set._id as mongoose.Types.ObjectId);
      match.currentSet = set._id as mongoose.Types.ObjectId;
      await match.save();
      res.json({ match, set });
      return;
    }
    
    res.json({ match });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Start a new set
export const startNewSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await MatchModel.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    if (match.status !== 'inProgress') {
      res.status(400).json({ error: 'Match is not in progress' });
      return;
    }
    
    // Check if current set is completed before creating a new one
    if (match.currentSet) {
      const currentSet = await SetModel.findById(match.currentSet);
      if (currentSet && currentSet.status !== 'completed') {
        res.status(400).json({ error: 'Current set is not completed yet' });
        return;
      }
    }
    
    // Get the actual highest set number from the database to avoid race conditions
    const existingSets = await SetModel.find({ matchId: match._id }).sort({ setNumber: -1 }).limit(1);
    const nextSetNumber = existingSets.length > 0 ? existingSets[0].setNumber + 1 : 1;
    
    // Get default team colors - alternate from the most recent set or use defaults
    let defaultTeamColors: [string, string] = ['#65bc7b', '#000000']; // Default green and black
    
    // Try to get colors from the most recent set and alternate them
    if (existingSets.length > 0 && existingSets[0].teamColors && existingSets[0].teamColors.length === 2) {
      // Alternate the colors for the new set
      defaultTeamColors = [existingSets[0].teamColors[1], existingSets[0].teamColors[0]];
    }
    
    const set = new SetModel({
      matchId: match._id,
      setNumber: nextSetNumber,
      scores: [0, 0],
      timeoutsUsed: [0, 0],
      status: 'notStarted',
      teamColors: defaultTeamColors,
    });
    await set.save();
    match.sets.push(set._id as mongoose.Types.ObjectId);
    match.currentSet = set._id as mongoose.Types.ObjectId;
    await match.save();
    res.json({ match, set });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Get current set for a match
export const getCurrentSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await MatchModel.findById(req.params.id).populate('currentSet');
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    
    if (!match.currentSet) {
      res.status(404).json({ error: 'No current set found' });
      return;
    }
    
    res.json(match.currentSet);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Get all sets for a match
export const getMatchSets = async (req: Request, res: Response): Promise<void> => {
  try {
    const sets = await SetModel.find({ matchId: req.params.id }).sort({ setNumber: 1 });
    res.json(sets);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Start a specific set
export const startSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { setId } = req.params;
    const set = await SetModel.findById(setId);
    
    if (!set) {
      res.status(404).json({ error: 'Set not found' });
      return;
    }
    if (set.status !== 'notStarted') {
      res.status(400).json({ error: 'Set can only be started from notStarted status' });
      return;
    }
    
    set.status = 'inProgress';
    set.startTime = new Date();
    await set.save();
    
    res.json(set);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// End a match
export const endMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await MatchModel.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    const machine = new MatchStateMachine(match);
    machine.endMatch();
    await match.save();
    res.json(match);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Abort a match
export const abortMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await MatchModel.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    const machine = new MatchStateMachine(match);
    machine.abortMatch();
    await match.save();
    res.json(match);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

// Get all matches created by current user
export const getMatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { page, limit, status } = req.query;
    
    // Parse pagination parameters with validation
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(0, parseInt(limit as string) || 50); // Default 50, 0 means no limit
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;
    
    // Build query filter
    const filter: any = { createdBy: req.user.id };
    if (status) {
      filter.status = status;
    }
    
    // Execute query with optimized selection (exclude full set objects, keep only IDs)
    const query = MatchModel.find(filter)
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .select('-sets'); // Exclude sets field to reduce bandwidth
    
    // Apply pagination if limit is specified
    if (limitNum > 0) {
      query.skip(skip).limit(limitNum);
    }
    
    const matches = await query.exec();
    
    // Get total count for pagination metadata
    const totalCount = await MatchModel.countDocuments(filter).exec();
    
    // Calculate pagination metadata
    const totalPages = limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1;
    
    // Prepare response with consistent structure
    res.json({
      success: true,
      data: {
        matches,
        pagination: {
          page: pageNum,
          limit: limitNum > 0 ? limitNum : totalCount,
          total: totalCount,
          pages: totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching matches',
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};
