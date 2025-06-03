import { Request, Response, Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { ScoreboardService } from '../services/scoreboardService';

const router = Router();

/**
 * POST /api/scoreboard/session
 * Create a new scoreboard session for a match
 * Public endpoint - no authentication required for viewing scoreboards
 */
router.post('/session', async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.body;

    const session = ScoreboardService.createSession(matchId);
    
    res.status(201).json({
      success: true,
      session
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * GET /api/scoreboard/session/:sessionId
 * Get scoreboard data for a specific session
 */
router.get('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = ScoreboardService.getSession(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found or expired' });
      return;
    }

    // If session has no match assigned, return session info without scoreboard data
    if (!session.matchId) {
      res.json({
        success: true,
        session,
        data: null,
        message: 'Session exists but no match assigned'
      });
      return;
    }

    const scoreboardData = await ScoreboardService.generateScoreboardData(session.matchId, sessionId);
    if (!scoreboardData) {
      res.status(404).json({ success: false, error: 'Match data not found' });
      return;
    }

    res.json({
      success: true,
      session,
      data: scoreboardData
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * PUT /api/scoreboard/session/:sessionId/view
 * Update the view settings for a session
 */
router.put('/session/:sessionId/view', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { view, bannerText } = req.body;

    if (!view) {
      res.status(400).json({ success: false, error: 'view is required' });
      return;
    }

    const session = ScoreboardService.getSession(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found or expired' });
      return;
    }

    const updated = ScoreboardService.updateSessionView(sessionId, view, bannerText);
    if (!updated) {
      res.status(400).json({ success: false, error: 'Failed to update session view' });
      return;
    }

    // Get updated scoreboard data only if session has a match
    let scoreboardData = null;
    if (session.matchId) {
      scoreboardData = await ScoreboardService.generateScoreboardData(session.matchId, sessionId);
    }

    res.json({
      success: true,
      session: ScoreboardService.getSession(sessionId),
      data: scoreboardData
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * DELETE /api/scoreboard/session/:sessionId
 * Remove a scoreboard session
 */
router.delete('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = ScoreboardService.getSession(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    ScoreboardService.removeSession(sessionId);

    res.json({
      success: true,
      message: 'Session removed successfully'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * GET /api/scoreboard/match/:matchId/sessions
 * Get all active sessions for a match
 */
router.get('/match/:matchId/sessions', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;
    
    const sessions = ScoreboardService.getMatchSessions(matchId);
    
    res.json({
      success: true,
      data: {
        matchId,
        sessionCount: sessions.length,
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          currentView: session.currentView,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          bannerText: session.bannerText
        }))
      }
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * GET /api/scoreboard/sessions
 * Get all active sessions (regardless of match assignment)
 */
router.get('/sessions', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = ScoreboardService.getAllSessions();
    
    res.json({
      success: true,
      data: {
        sessionCount: sessions.length,
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          matchId: session.matchId,
          currentView: session.currentView,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          bannerText: session.bannerText
        }))
      }
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * GET /api/scoreboard/match/:matchId
 * Get scoreboard data for a match (without session)
 */
router.get('/match/:matchId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;
    
    const scoreboardData = await ScoreboardService.generateScoreboardData(matchId);
    if (!scoreboardData) {
      res.status(404).json({ success: false, error: 'Match not found' });
      return;
    }

    res.json({
      success: true,
      data: scoreboardData
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * POST /api/scoreboard/cleanup
 * Clean up expired sessions (admin only)
 */
router.post('/cleanup', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    // For now, we'll just return the current number of sessions
    // Since cleanupExpiredSessions is private, we'll trigger it indirectly
    const allSessions = ScoreboardService.getMatchSessions(''); // This will trigger cleanup
    
    res.json({
      success: true,
      data: {
        message: 'Session cleanup triggered successfully'
      }
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * PUT /api/scoreboard/session/:sessionId/match
 * Assign a match to an existing scoreboard session
 */
router.put('/session/:sessionId/match', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { matchId } = req.body;

    if (!matchId) {
      res.status(400).json({ success: false, error: 'matchId is required' });
      return;
    }

    const success = ScoreboardService.assignMatchToSession(sessionId, matchId);
    if (!success) {
      res.status(404).json({ success: false, error: 'Session not found or expired' });
      return;
    }

    const session = ScoreboardService.getSession(sessionId);
    res.json({
      success: true,
      session
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;
