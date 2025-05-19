import express, { RequestHandler } from 'express'; // Import RequestHandler
import { forgotPassword, login, logout, resetPassword } from '../controllers/authController'; // Add login, forgotPassword and resetPassword

const router = express.Router();

// Route for user login
router.post('/login', login as RequestHandler); // Cast to RequestHandler

// Route for user logout
router.post('/logout', logout as RequestHandler); // Cast to RequestHandler

// Route for requesting a password reset
router.post('/forgot-password', forgotPassword as RequestHandler); // Cast to RequestHandler

// Route for resetting the password
router.post('/reset-password/:token', resetPassword as RequestHandler); // Cast to RequestHandler

export default router;
