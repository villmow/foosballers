"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.logout = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User"); // Corrected: UserModel is the exported model
const emailService_1 = require("../services/emailService");
const tokenBlacklistService_1 = require("../services/tokenBlacklistService");
const jwtUtils_1 = require("../utils/jwtUtils");
const passwordUtils_1 = require("../utils/passwordUtils");
// Controller for handling user authentication
/**
 * Endpoint for user login
 * Authenticates user credentials and returns a JWT token
 */
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }
        // Find user by email
        const user = yield User_1.UserModel.findOne({ email });
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        // Check if account is locked
        if (user.loginAttempts >= 5 && user.lockUntil && user.lockUntil > new Date()) {
            res.status(401).json({
                message: 'Account is locked. Try again later or reset your password.',
                lockUntil: user.lockUntil
            });
            return;
        }
        // Check password
        const isValid = yield (0, passwordUtils_1.comparePassword)(password, user.password);
        if (!isValid) {
            // Increment login attempts on failed login
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            // Lock account after 5 failed attempts
            if (user.loginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
            }
            yield user.save();
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        // Reset login attempts on successful login
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.lastLogin = new Date();
        yield user.save();
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '90m' } // 90 minutes token expiry
        );
        // Set cookie with the token
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 90 * 60 * 1000 // 90 minutes in milliseconds
        });
        // Send response
        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error during login' });
    }
});
exports.login = login;
/**
 * Endpoint for user logout
 * Invalidates the token by adding it to a blacklist and clearing the cookie
 * This implementation uses HTTP-only cookies for token storage and management
 */
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let token;
        // Get token from cookie or authorization header
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // If token exists, blacklist it
        if (token) {
            // Get token expiry from payload
            const decoded = jsonwebtoken_1.default.decode(token);
            let expiryDate;
            if (decoded && typeof decoded !== 'string' && decoded.exp) {
                // Convert expiration time to Date object
                expiryDate = new Date(decoded.exp * 1000);
            }
            else {
                // If can't decode, set a default expiry (1 hour from now)
                expiryDate = new Date(Date.now() + 3600000);
            }
            // Add token to blacklist with expiry time - if this fails, it will be caught by the outer try/catch
            (0, tokenBlacklistService_1.blacklistToken)(token, expiryDate);
        }
        // Clear the token cookie regardless of whether we successfully blacklisted
        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            expires: new Date(0) // Set expiration to epoch time (invalidates immediately)
        });
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error during logout' });
    }
});
exports.logout = logout;
/**
 * Endpoint for requesting a password reset
 * Generates a password reset token and sends it to the user's email
 */
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const user = yield User_1.UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const token = (0, jwtUtils_1.generatePasswordResetToken)(user._id.toString());
        user.passwordResetToken = token;
        user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour from now
        yield user.save();
        yield (0, emailService_1.sendPasswordResetEmail)(user.email, token);
        res.status(200).json({ message: 'Password reset email sent' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.forgotPassword = forgotPassword;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield User_1.UserModel.findOne({
            _id: decoded.id,
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }
        // Set the new password
        user.password = password;
        user.passwordResetToken = undefined; // Clear the reset token fields
        user.passwordResetExpires = undefined;
        yield user.save();
        // Optionally, log the user in or send a confirmation email
        res.status(200).json({ message: 'Password has been reset successfully.' });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(400).json({ message: 'Invalid token.' });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(400).json({ message: 'Token has expired.' });
        }
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.resetPassword = resetPassword;
