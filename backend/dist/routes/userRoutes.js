"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// User registration endpoint - public access
router.post('/register', userController_1.register);
// Admin-only user creation endpoint
router.post('/create', authMiddleware_1.requireAuth, (0, authMiddleware_1.requireRole)(['administrator']), userController_1.createUser);
// User profile update endpoint - authenticated users only
router.put('/profile', authMiddleware_1.requireAuth, userController_1.updateProfile);
// Get all users - admin only
router.get('/', authMiddleware_1.requireAuth, (0, authMiddleware_1.requireRole)(['administrator']), ((req, res) => {
    // This would typically call a controller method
    // Placeholder for now
    res.status(200).json({ message: 'Get all users - admin only endpoint' });
}));
exports.default = router;
