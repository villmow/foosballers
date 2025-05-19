import express, { RequestHandler } from 'express';
import { createUser, register, updateProfile } from '../controllers/userController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// User registration endpoint - public access
router.post('/register', register);

// Admin-only user creation endpoint
router.post('/create', 
  requireAuth as RequestHandler, 
  requireRole(['administrator']) as RequestHandler, 
  createUser as RequestHandler);

// User profile update endpoint - authenticated users only
router.put('/profile', 
  requireAuth as RequestHandler, 
  updateProfile as RequestHandler);

// Get all users - admin only
router.get('/', 
  requireAuth as RequestHandler, 
  requireRole(['administrator']) as RequestHandler, 
  ((req, res) => {
    // This would typically call a controller method
    // Placeholder for now
    res.status(200).json({ message: 'Get all users - admin only endpoint' });
  }) as RequestHandler
);

export default router;
