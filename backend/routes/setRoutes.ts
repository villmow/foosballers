import { Router } from 'express';
import {
    assignTeamColors,
    completeSet,
    createSet,
    deleteSet,
    getSet,
    getSetGoals,
    getSetTimeouts,
    startSet,
    updateSet
} from '../controllers/setController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// All set routes require authentication
router.use(requireAuth);

// Set CRUD operations
router.post('/', createSet);
router.get('/:setId', getSet);
router.put('/:setId', updateSet);
router.delete('/:setId', deleteSet);

// Set lifecycle operations
router.post('/:setId/start', startSet);
router.post('/:setId/complete', completeSet);

// Set team colors assignment
router.put('/:setId/colors', assignTeamColors);

// Set-related data endpoints
router.get('/:setId/goals', getSetGoals);
router.get('/:setId/timeouts', getSetTimeouts);

export default router;
