import { Request, Response } from 'express';
import { MatchModel } from '../models/Match';
import { SetModel } from '../models/Set';
import { TimeoutModel } from '../models/Timeout';
import { GameProgressionService } from '../services/gameProgressionService';

// Create a new timeout
export const createTimeout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId, setId, teamIndex, timestamp } = req.body;

    // Validate required fields
    if (!matchId || !setId || typeof teamIndex !== 'number' || !timestamp) {
      res.status(400).json({ success: false, error: 'Missing required fields: matchId, setId, teamIndex, timestamp' });
      return;
    }

    // Validate teamIndex
    if (teamIndex !== 0 && teamIndex !== 1) {
      res.status(400).json({ success: false, error: 'teamIndex must be 0 or 1' });
      return;
    }

    // Verify match and set exist
    const match = await MatchModel.findById(matchId);
    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' });
      return;
    }

    const set = await SetModel.findById(setId);
    if (!set) {
      res.status(404).json({ success: false, error: 'Set not found' });
      return;
    }

    // Verify set belongs to the match
    if (set.matchId.toString() !== matchId) {
      res.status(400).json({ success: false, error: 'Set does not belong to the specified match' });
      return;
    }

    // Check if set is in a state where timeouts can be added
    if (set.status === 'completed') {
      res.status(400).json({ success: false, error: 'Cannot add timeouts to a completed set' });
      return;
    }

    // Check timeout limits if match has timeout configuration
    if (match.timeoutsPerSet !== undefined && match.timeoutsPerSet !== null) {
      const currentTimeouts = await TimeoutModel.countDocuments({
        setId,
        teamIndex,
        voided: false
      });

      if (currentTimeouts >= match.timeoutsPerSet) {
        res.status(400).json({ 
          success: false,
          error: `Team has already used all ${match.timeoutsPerSet} timeouts for this set` 
        });
        return;
      }
    }

    const timeout = new TimeoutModel({
      matchId,
      setId,
      teamIndex,
      timestamp: new Date(timestamp),
      voided: false
    });

    await timeout.save();
    
    // Process game progression explicitly
    const progressionService = new GameProgressionService();
    const progressionResult = await progressionService.processTimeoutProgression(timeout);
    
    // Populate the timeout with match and set data for response
    const populatedTimeout = await TimeoutModel.findById(timeout._id)
      .populate('matchId')
      .populate('setId');

    // Return the timeout along with updated set and match information
    res.status(201).json({
      success: true,
      data: {
        timeout: populatedTimeout,
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

// Get all timeouts for a match
export const getMatchTimeouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;
    const { includeVoided } = req.query;

    const filter: any = { matchId };
    if (includeVoided !== 'true') {
      filter.voided = false;
    }

    const timeouts = await TimeoutModel.find(filter)
      .populate('setId')
      .sort({ timestamp: 1 });

    res.json({ success: true, data: timeouts });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Get all timeouts for a set
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

// Get timeout usage statistics for a match
export const getMatchTimeoutStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;

    const match = await MatchModel.findById(matchId);
    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found' });
      return;
    }

    const sets = await SetModel.find({ matchId }).sort({ setNumber: 1 });
    const timeoutStats = [];

    for (const set of sets) {
      const setTimeouts = await TimeoutModel.find({ 
        setId: set._id, 
        voided: false 
      });

      const team0Timeouts = setTimeouts.filter(t => t.teamIndex === 0).length;
      const team1Timeouts = setTimeouts.filter(t => t.teamIndex === 1).length;

      timeoutStats.push({
        setId: set._id,
        setNumber: set.setNumber,
        team0Timeouts,
        team1Timeouts,
        totalTimeouts: team0Timeouts + team1Timeouts
      });
    }

    res.json({
      success: true,
      data: {
        matchId,
        timeoutsPerSet: match.timeoutsPerSet || null,
        sets: timeoutStats
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Get a specific timeout
export const getTimeout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeoutId } = req.params;

    const timeout = await TimeoutModel.findById(timeoutId)
      .populate('matchId')
      .populate('setId');

    if (!timeout) {
      res.status(404).json({ success: false, error: 'Timeout not found' });
      return;
    }

    res.json({ success: true, data: timeout });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Update a timeout (mainly for voiding/unvoiding)
export const updateTimeout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeoutId } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = ['voided', 'timestamp'];
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

    const timeout = await TimeoutModel.findByIdAndUpdate(
      timeoutId,
      actualUpdates,
      { new: true, runValidators: true }
    ).populate('matchId').populate('setId');

    if (!timeout) {
      res.status(404).json({ success: false, error: 'Timeout not found' });
      return;
    }

    res.json({ success: true, data: timeout });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Void a timeout
export const voidTimeout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeoutId } = req.params;

    const timeout = await TimeoutModel.findByIdAndUpdate(
      timeoutId,
      { voided: true },
      { new: true, runValidators: true }
    ).populate('matchId').populate('setId');

    if (!timeout) {
      res.status(404).json({ success: false, error: 'Timeout not found' });
      return;
    }

    // Process game progression explicitly
    const progressionService = new GameProgressionService();
    const progressionResult = await progressionService.processTimeoutVoidingProgression(timeout);

    // Return the timeout along with updated set and match information
    res.json({
      success: true,
      data: {
        timeout,
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

// Unvoid a timeout
export const unvoidTimeout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeoutId } = req.params;

    const timeout = await TimeoutModel.findByIdAndUpdate(
      timeoutId,
      { voided: false },
      { new: true, runValidators: true }
    ).populate('matchId').populate('setId');

    if (!timeout) {
      res.status(404).json({ success: false, error: 'Timeout not found' });
      return;
    }

    // Process game progression explicitly
    const progressionService = new GameProgressionService();
    const progressionResult = await progressionService.processTimeoutVoidingProgression(timeout);

    // Return the timeout along with updated set and match information
    res.json({
      success: true,
      data: {
        timeout,
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

// Delete a timeout
export const deleteTimeout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeoutId } = req.params;

    const timeout = await TimeoutModel.findByIdAndDelete(timeoutId);
    if (!timeout) {
      res.status(404).json({ success: false, error: 'Timeout not found' });
      return;
    }

    res.json({ success: true, message: 'Timeout deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};
