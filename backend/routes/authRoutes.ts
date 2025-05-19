import express from 'express';
import { logout } from '../controllers/authController';

const router = express.Router();

// Route for user logout
router.post('/logout', logout);

export default router;
