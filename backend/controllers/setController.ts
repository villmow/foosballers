import { Request, Response } from 'express';
import { GoalModel } from '../models/Goal';
import { MatchModel } from '../models/Match';
import { SetModel } from '../models/Set';
import { TimeoutModel } from '../models/Timeout';
import { GameProgressionService } from '../services/gameProgressionService';
import { ScoreboardBroadcastService } from '../services/scoreboardBroadcastService';

// Create a new set
export const createSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId, setNumber, teamColors } = req.body;

    // Validate required fields
    if (!matchId || typeof setNumber !== 'number') {
      res.status(400).json({ success: false, error: 'Missing required fields: matchId, setNumber' });
      return;
    }

    // Validate teamColors
    if (!teamColors || !Array.isArray(teamColors) || teamColors.length !== 2) {
      res.status(400).json({ 
        success: false,
        error: 'teamColors must be an array of exactly 2 color strings' 
      });
      return;
    }

    if (!teamColors.every(color => typeof color === 'string' && color.trim().length > 0)) {
      res.status(400).json({ 
        success: false,
        error: 'Each team color must be a non-empty string' 
      });
      return;
    }

    // Verify match exists
    const match = await MatchModel.findById(matchId);
    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' });
      return;
    }

    // Check if set with this number already exists for this match
    const existingSet = await SetModel.findOne({ matchId, setNumber });
    if (existingSet) {
      res.status(409).json({ success: false, error: 'Set with this number already exists for this match' });
      return;
    }

    const set = new SetModel({
      matchId,
      setNumber,
      scores: [0, 0],
      timeoutsUsed: [0, 0],
      status: 'notStarted',
      teamColors: teamColors as [string, string]
    });

    await set.save();
    
    // Populate the set with match data for response
    const populatedSet = await SetModel.findById(set._id).populate('matchId');
    res.status(201).json({ success: true, data: populatedSet });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Get a set by ID
export const getSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { setId } = req.params;

    const set = await SetModel.findById(setId)
      .populate('matchId')
      .populate('goals')
      .populate('timeouts');

    if (!set) {
      res.status(404).json({ success: false, error: 'Set not found' });
      return;
    }

    res.json({ success: true, data: set });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Update a set by ID
export const updateSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { setId } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = ['scores', 'timeoutsUsed', 'status', 'winner', 'startTime', 'endTime'];
    const actualUpdates: any = {};
    
    for (const key of allowedUpdates) {
      if (key in updates) {
        actualUpdates[key] = updates[key];
      }
    }

    if (Object.keys(actualUpdates).length === 0) {
      res.status(400).json({ success: false, error: 'No valid updates provided' });
      return;
    }

    const set = await SetModel.findByIdAndUpdate(
      setId,
      actualUpdates,
      { new: true, runValidators: true }
    ).populate('matchId');

    if (!set) {
      res.status(404).json({ success: false, error: 'Set not found' });
      return;
    }

    res.json({ success: true, data: set });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Delete a set by ID
export const deleteSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { setId } = req.params;

    const set = await SetModel.findByIdAndDelete(setId);
    if (!set) {
      res.status(404).json({ success: false, error: 'Set not found' });
      return;
    }

    res.json({ success: true, message: 'Set deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Start a set
export const startSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { setId } = req.params;
    const set = await SetModel.findById(setId);
    
    if (!set) {
      res.status(404).json({ success: false, error: 'Set not found' });
      return;
    }
    if (set.status !== 'notStarted') {
      res.status(400).json({ success: false, error: 'Set can only be started from notStarted status' });
      return;
    }
    
    set.status = 'inProgress';
    set.startTime = new Date();
    await set.save();
    
    res.json({ success: true, data: set });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Complete a set
export const completeSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { setId } = req.params;
    const { winner } = req.body;
    
    // Process game progression explicitly using the service
    const progressionService = new GameProgressionService();
    const progressionResult = await progressionService.processManualSetCompletion(setId, winner);
    
    // Broadcast scoreboard updates
    if (progressionResult.set) {
      await ScoreboardBroadcastService.broadcastSetUpdate(progressionResult.set, progressionResult.newSetCreated);
    }
    if (progressionResult.matchCompleted && progressionResult.match) {
      await ScoreboardBroadcastService.broadcastMatchUpdate(progressionResult.match);
    }
    
    // Return the set along with updated match information
    res.json({
      success: true,
      data: {
        set: progressionResult.set,
        match: progressionResult.match,
        progression: {
          setCompleted: progressionResult.setCompleted,
          matchCompleted: progressionResult.matchCompleted,
          newSetCreated: progressionResult.newSetCreated
        }
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Get goals for a set
export const getSetGoals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { setId } = req.params;
    const { includeVoided } = req.query;

    const filter: any = { setId };
    if (includeVoided !== 'true') {
      filter.voided = false;
    }

    const goals = await GoalModel.find(filter)
      .populate('matchId')
      .populate('setId')
      .sort({ timestamp: 1 });

    res.json({ success: true, data: goals });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Get timeouts for a set
export const getSetTimeouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { setId } = req.params;
    const { includeVoided } = req.query;

    const filter: any = { setId };
    if (includeVoided !== 'true') {
      filter.voided = false;
    }

    const timeouts = await TimeoutModel.find(filter)
      .populate('matchId')
      .populate('setId')
      .sort({ timestamp: 1 });

    res.json({ success: true, data: timeouts });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Assign team colors to a set
export const assignTeamColors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { setId } = req.params;
    const { teamColors } = req.body;

    // Validate required fields
    if (!teamColors || !Array.isArray(teamColors) || teamColors.length !== 2) {
      res.status(400).json({ 
        success: false,
        error: 'teamColors must be an array of exactly 2 color strings' 
      });
      return;
    }

    // Validate that both colors are non-empty strings
    if (!teamColors.every(color => typeof color === 'string' && color.trim().length > 0)) {
      res.status(400).json({ 
        success: false,
        error: 'Each team color must be a non-empty string' 
      });
      return;
    }

    // Find the set
    const set = await SetModel.findById(setId);
    if (!set) {
      res.status(404).json({ success: false, error: 'Set not found' });
      return;
    }

    // Verify the associated match exists
    const match = await MatchModel.findById(set.matchId);
    if (!match) {
      res.status(404).json({ success: false, error: 'Associated match not found' });
      return;
    }

    // Update the set with team colors
    set.teamColors = teamColors as [string, string];
    await set.save();

    // Return the updated set
    const updatedSet = await SetModel.findById(setId).populate('matchId');
    res.json({ success: true, data: updatedSet });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Middleware to resolve setNumber to setId for match-based routes
export const resolveSetByNumber = async (req: Request, res: Response, next: any): Promise<void> => {
  try {
    const { matchId, setNumber } = req.params;
    
    if (!matchId || !setNumber) {
      res.status(400).json({ success: false, error: 'Missing matchId or setNumber' });
      return;
    }

    const set = await SetModel.findOne({ 
      matchId, 
      setNumber: parseInt(setNumber) 
    });

    if (!set) {
      res.status(404).json({ success: false, error: 'Set not found' });
      return;
    }

    // Add setId to params for downstream handlers
    req.params.setId = (set as any)._id.toString();
    next();
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};
