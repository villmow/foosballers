import express from 'express';
import { createUser, register, updateProfile } from '../controllers/userController';

const router = express.Router();

// User registration endpoint
router.post('/register', register);

// Admin-only user creation endpoint
router.post('/create', createUser);

// User profile update endpoint
router.put('/profile', updateProfile);

export default router;
