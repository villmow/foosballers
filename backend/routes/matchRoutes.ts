import { Router } from 'express';
import { getMatchGoals } from '../controllers/goalController';
import {
    abortMatch,
    createMatch,
    deleteMatch,
    endMatch,
    getCurrentSet,
    getMatch,
    getMatchSets,
    startMatch,
    startNewSet,
    updateMatch
} from '../controllers/matchController';
import {
    completeSet,
    deleteSet,
    getSet,
    getSetGoals,
    getSetTimeouts,
    resolveSetByNumber,
    startSet,
    updateSet
} from '../controllers/setController';
import { getMatchTimeouts, getMatchTimeoutStats } from '../controllers/timeoutController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Create match (public for now, but could require auth)
router.post('/', createMatch);

// All other match routes require authentication
router.use(requireAuth);

// Basic match CRUD operations
router.get('/:id', getMatch);
router.put('/:id', updateMatch);
router.delete('/:id', deleteMatch);

// Match lifecycle endpoints
router.post('/:id/start', startMatch);
router.post('/:id/end', endMatch);
router.post('/:id/abort', abortMatch);

// Match sets endpoints
router.get('/:id/sets', getMatchSets);
router.post('/:id/sets', startNewSet);
router.get('/:matchId/sets/current', getCurrentSet);

// Match-based set operations using setNumber
router.get('/:matchId/sets/:setNumber', resolveSetByNumber, getSet);
router.put('/:matchId/sets/:setNumber', resolveSetByNumber, updateSet);
router.delete('/:matchId/sets/:setNumber', resolveSetByNumber, deleteSet);
router.post('/:matchId/sets/:setNumber/start', resolveSetByNumber, startSet);
router.post('/:matchId/sets/:setNumber/complete', resolveSetByNumber, completeSet);
router.get('/:matchId/sets/:setNumber/goals', resolveSetByNumber, getSetGoals);
router.get('/:matchId/sets/:setNumber/timeouts', resolveSetByNumber, getSetTimeouts);

// Match goals and timeouts
router.get('/:matchId/goals', getMatchGoals);
router.get('/:matchId/timeouts', getMatchTimeouts);
router.get('/:matchId/timeouts/stats', getMatchTimeoutStats);

export default router;
