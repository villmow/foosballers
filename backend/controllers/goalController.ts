import { Request, Response } from 'express';
import { GoalModel } from '../models/Goal';
import { MatchModel } from '../models/Match';
import { SetModel } from '../models/Set';
import { GameProgressionService } from '../services/gameProgressionService';
import { ScoreboardBroadcastService } from '../services/scoreboardBroadcastService';

// Create a new goal
export const createGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId, setId, teamIndex, timestamp, scoringRow } = req.body;

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

    // Check if set is in a state where goals can be added
    if (set.status === 'completed') {
      res.status(400).json({ success: false, error: 'Cannot add goals to a completed set' });
      return;
    }

    const goal = new GoalModel({
      matchId,
      setId,
      teamIndex,
      timestamp: new Date(timestamp),
      scoringRow,
      voided: false
    });

    await goal.save();
    
    // Process game progression explicitly
    const progressionService = new GameProgressionService();
    const progressionResult = await progressionService.processGoalProgression(goal);
    
    // Broadcast scoreboard updates
    await ScoreboardBroadcastService.broadcastGoal(goal, progressionResult);
    
    // Populate the goal with match and set data for response
    const populatedGoal = await GoalModel.findById(goal._id)
      .populate('matchId')
      .populate('setId');

    // Return the goal along with updated set and match information
    res.status(201).json({
      success: true,
      data: {
        goal: populatedGoal,
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

// Get all goals for a match
export const getMatchGoals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;
    const { includeVoided } = req.query;

    const filter: any = { matchId };
    if (includeVoided !== 'true') {
      filter.voided = false;
    }

    const goals = await GoalModel.find(filter)
      .populate('setId')
      .sort({ timestamp: 1 });

    res.json({ success: true, data: goals });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Get all goals for a set
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

// Get a specific goal
export const getGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { goalId } = req.params;

    const goal = await GoalModel.findById(goalId)
      .populate('matchId')
      .populate('setId');

    if (!goal) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Update a goal (mainly for voiding/unvoiding)
export const updateGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { goalId } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = ['voided', 'scoringRow', 'timestamp'];
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

    const goal = await GoalModel.findByIdAndUpdate(
      goalId,
      actualUpdates,
      { new: true, runValidators: true }
    ).populate('matchId').populate('setId');

    if (!goal) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};

// Void a goal
export const voidGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { goalId } = req.params;

    const goal = await GoalModel.findByIdAndUpdate(
      goalId,
      { voided: true },
      { new: true, runValidators: true }
    ).populate('matchId').populate('setId');

    if (!goal) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    // Process game progression explicitly
    const progressionService = new GameProgressionService();
    const progressionResult = await progressionService.processGoalVoidingProgression(goal);
    
    // Broadcast scoreboard updates
    await ScoreboardBroadcastService.broadcastGoal(goal, progressionResult);

    // Return the goal along with updated set and match information
    res.json({
      success: true,
      data: {
        goal,
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

// Unvoid a goal
export const unvoidGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { goalId } = req.params;

    const goal = await GoalModel.findByIdAndUpdate(
      goalId,
      { voided: false },
      { new: true, runValidators: true }
    ).populate('matchId').populate('setId');

    if (!goal) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    // Process game progression explicitly
    const progressionService = new GameProgressionService();
    const progressionResult = await progressionService.processGoalVoidingProgression(goal);
    
    // Broadcast scoreboard updates
    await ScoreboardBroadcastService.broadcastGoal(goal, progressionResult);

    // Return the goal along with updated set and match information
    res.json({
      success: true,
      data: {
        goal,
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

// Delete a goal
export const deleteGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { goalId } = req.params;

    const goal = await GoalModel.findByIdAndDelete(goalId);
    if (!goal) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
};
