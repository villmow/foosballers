import { Router } from 'express';
import {
    createTimeout,
    deleteTimeout,
    getMatchTimeouts,
    getMatchTimeoutStats,
    getSetTimeouts,
    getTimeout,
    unvoidTimeout,
    voidTimeout
} from '../controllers/timeoutController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// All timeout routes require authentication
router.use(requireAuth);

// Timeout CRUD operations
router.post('/', createTimeout);
router.get('/:timeoutId', getTimeout);
// router.put('/:timeoutId', updateTimeout);
router.delete('/:timeoutId', deleteTimeout);

// Timeout voiding operations
router.post('/:timeoutId/void', voidTimeout);
router.post('/:timeoutId/unvoid', unvoidTimeout);

// Get timeouts by match or set
router.get('/match/:matchId', getMatchTimeouts);
router.get('/set/:setId', getSetTimeouts);

// Get timeout statistics for a match
router.get('/match/:matchId/stats', getMatchTimeoutStats);

export default router;
