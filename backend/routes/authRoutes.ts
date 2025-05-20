import express from 'express';
import { forgotPassword, login, logout, resetPassword } from '../controllers/authController';
import { AuthRequest, logAuthEvents, requireAuth } from '../middleware/authMiddleware';
// import { getCsrfToken } from '../middleware/securityMiddleware';

const router = express.Router();

// Helper to wrap async route handlers
type AsyncHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
function asyncHandler(fn: AsyncHandler) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Route for user login
router.post('/login', logAuthEvents, asyncHandler(login));

// Route for user logout - requires authentication
router.post('/logout', requireAuth as express.RequestHandler, logAuthEvents as express.RequestHandler, (req, res, next) => {
  logout(req as AuthRequest, res)
    .then(() => undefined)
    .catch(next);
});

// Route for requesting a password reset
router.post('/forgot-password', logAuthEvents, asyncHandler(forgotPassword));

// Route for resetting the password
router.post('/reset-password/:token', logAuthEvents, asyncHandler(resetPassword));

// Route for checking token validity - e.g., session check
router.get('/verify-token', requireAuth as express.RequestHandler, function (req, res) {
  const user = (req as any).user;
  res.status(200).json({ valid: true, user });
});

// // Endpoint for front-end to fetch a fresh CSRF token cookie
// router.get('/csrf-token', getCsrfToken);

export default router;
