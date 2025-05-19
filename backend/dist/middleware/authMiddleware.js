"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuthEvents = exports.sessionTimeout = exports.requireRole = exports.requireAuth = exports.authenticateJWT = void 0;
const tokenBlacklistService_1 = require("../services/tokenBlacklistService");
const jwtUtils_1 = require("../utils/jwtUtils");
/**
 * Middleware to authenticate requests with JWT
 * Gets token from authorization header or cookie
 * Verifies token validity and adds user data to request
 */
const authenticateJWT = (req, res, next) => {
    // Get token from authorization header or cookie
    let token;
    // Check for token in cookie first (preferred method)
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    // Otherwise check for token in Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // If no token found, pass to next middleware (will be caught by protected routes)
    if (!token) {
        return next();
    }
    // Check if token is blacklisted
    if ((0, tokenBlacklistService_1.isTokenBlacklisted)(token)) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    // Verify token
    const decoded = (0, jwtUtils_1.verifyJWT)(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    // Add user data to request
    req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        lastActivity: new Date() // Set initial activity time
    };
    next();
};
exports.authenticateJWT = authenticateJWT;
/**
 * Middleware to protect routes that require authentication
 * Must be used after authenticateJWT middleware
 */
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    // Update last activity timestamp
    req.user.lastActivity = new Date();
    next();
};
exports.requireAuth = requireAuth;
/**
 * Middleware for role-based authorization
 * @param allowedRoles - Array of roles allowed to access the route
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Middleware to enforce session timeout after inactivity
 * Checks if the last activity was within the allowed timeframe (90 minutes)
 */
const sessionTimeout = (req, res, next) => {
    if (!req.user || !req.user.lastActivity) {
        return next();
    }
    const currentTime = new Date();
    const lastActivity = new Date(req.user.lastActivity);
    const inactivityTime = currentTime.getTime() - lastActivity.getTime();
    // 90 minutes in milliseconds
    const timeoutDuration = 90 * 60 * 1000;
    if (inactivityTime > timeoutDuration) {
        // Session has timed out
        return res.status(440).json({ error: 'Session expired', reason: 'inactivity' });
    }
    // Update last activity time
    req.user.lastActivity = currentTime;
    next();
};
exports.sessionTimeout = sessionTimeout;
/**
 * Middleware to log authentication events
 */
const logAuthEvents = (req, res, next) => {
    // Clone the response
    const oldSend = res.send;
    res.send = function (data) {
        var _a, _b;
        // Log based on response status
        const authEvent = {
            timestamp: new Date(),
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'unauthenticated',
            username: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.username) || 'unauthenticated',
            statusCode: res.statusCode,
        };
        // Log authentication events
        if (req.path.includes('/auth/') || req.path.includes('/login') || req.path.includes('/logout')) {
            console.log('AUTH EVENT:', authEvent);
            // In a production app, you would want to write this to a secure log file or service
            // Example: authLogger.info('Authentication event', authEvent);
        }
        // Call the original send function
        return oldSend.call(this, data);
    };
    next();
};
exports.logAuthEvents = logAuthEvents;
