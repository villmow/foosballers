import { Router } from 'express';
import { createMatch, deleteMatch, getMatch, updateMatch } from '../controllers/matchController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// All match routes require authentication
router.post('/', createMatch);
router.get('/:id', requireAuth, getMatch);
router.put('/:id', requireAuth, updateMatch);
router.delete('/:id', requireAuth, deleteMatch);

export default router;
