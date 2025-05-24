import { Router } from 'express';
import {
    createGoal,
    deleteGoal,
    getGoal,
    unvoidGoal,
    updateGoal,
    voidGoal
} from '../controllers/goalController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// All goal routes require authentication
router.use(requireAuth);

// Goal CRUD operations
router.post('/', createGoal);
router.get('/:goalId', getGoal);
router.put('/:goalId', updateGoal);
router.delete('/:goalId', deleteGoal);

// Goal voiding operations
router.post('/:goalId/void', voidGoal);
router.post('/:goalId/unvoid', unvoidGoal);

export default router;
