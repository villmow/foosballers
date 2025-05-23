import { Router } from 'express';
import {
    abortMatch,
    completeSet,
    createMatch, deleteMatch,
    endMatch,
    getCurrentSet,
    getMatch,
    getMatchSets,
    startMatch,
    startNewSet,
    startSet,
    updateMatch
} from '../controllers/matchController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// All match routes require authentication
router.post('/', createMatch);
router.get('/:id', requireAuth, getMatch);
router.put('/:id', requireAuth, updateMatch);
router.delete('/:id', requireAuth, deleteMatch);

// Match lifecycle endpoints
router.post('/:id/start', requireAuth, startMatch);
router.post('/:id/sets', requireAuth, startNewSet);
router.post('/:id/end', requireAuth, endMatch);
router.post('/:id/abort', requireAuth, abortMatch);

// Set-specific endpoints
router.get('/:id/current-set', requireAuth, getCurrentSet);
router.get('/:id/sets/all', requireAuth, getMatchSets);
router.post('/sets/:setId/start', requireAuth, startSet);
router.post('/sets/:setId/complete', requireAuth, completeSet);

export default router;
