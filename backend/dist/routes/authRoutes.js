"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Helper to wrap async route handlers
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Route for user login
router.post('/login', authMiddleware_1.logAuthEvents, asyncHandler(authController_1.login));
// Route for user logout - requires authentication
router.post('/logout', authMiddleware_1.requireAuth, authMiddleware_1.logAuthEvents, asyncHandler(authController_1.logout));
// Route for requesting a password reset
router.post('/forgot-password', authMiddleware_1.logAuthEvents, asyncHandler(authController_1.forgotPassword));
// Route for resetting the password
router.post('/reset-password/:token', authMiddleware_1.logAuthEvents, asyncHandler(authController_1.resetPassword));
// Route for checking token validity - e.g., session check
router.get('/verify-token', authMiddleware_1.requireAuth, (req, res) => {
    const user = req.user;
    res.status(200).json({ valid: true, user });
});
exports.default = router;
