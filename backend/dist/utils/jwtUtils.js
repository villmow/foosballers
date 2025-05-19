"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePasswordResetToken = void 0;
exports.generateJWT = generateJWT;
exports.verifyJWT = verifyJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRES_IN = '90m'; // 90 minutes session timeout
/**
 * Generates a JWT token for authentication
 * @param payload - User data to include in the token
 * @returns Signed JWT token
 */
function generateJWT(payload) {
    const tokenPayload = Object.assign(Object.assign({}, payload), { lastActivity: Date.now() // Add last activity timestamp
     });
    return jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
/**
 * Verifies a JWT token and checks for session timeout
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
function verifyJWT(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Check for session timeout (90 minutes of inactivity)
        if (decoded.lastActivity) {
            const currentTime = Date.now();
            const lastActivityTime = decoded.lastActivity;
            const inactivityTime = currentTime - lastActivityTime;
            // 90 minutes in milliseconds
            const timeoutDuration = 90 * 60 * 1000;
            if (inactivityTime > timeoutDuration) {
                // Session has timed out
                return null;
            }
        }
        return decoded;
    }
    catch (err) {
        return null;
    }
}
/**
 * Generates a token specifically for password reset
 * @param userId - User ID to include in token
 * @returns Signed JWT token with 1 hour expiration
 */
const generatePasswordResetToken = (userId) => {
    return jsonwebtoken_1.default.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour
};
exports.generatePasswordResetToken = generatePasswordResetToken;
