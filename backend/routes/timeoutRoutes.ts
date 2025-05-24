import { Router } from 'express';
import {
    createTimeout,
    deleteTimeout,
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

export default router;
