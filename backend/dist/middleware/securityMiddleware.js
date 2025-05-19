"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfProtection = exports.generateCsrfToken = exports.securityHeaders = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Set security headers for all responses
 */
const securityHeaders = (req, res, next) => {
    // Set security headers
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline';",
        'Referrer-Policy': 'same-origin',
        'Permissions-Policy': 'microphone=(), camera=()',
    });
    next();
};
exports.securityHeaders = securityHeaders;
/**
 * CSRF token generation
 */
const generateCsrfToken = (req, res, next) => {
    // Skip for non-HTML responses or for specific paths
    if (req.path.startsWith('/api/') || req.path.endsWith('.json')) {
        return next();
    }
    // Generate random CSRF token
    const token = crypto_1.default.randomBytes(32).toString('hex');
    // Save in session or cookie
    res.cookie('XSRF-TOKEN', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    // Add to request for templates to use
    req.csrfToken = token;
    next();
};
exports.generateCsrfToken = generateCsrfToken;
/**
 * CSRF Protection middleware
 * Verifies that the CSRF token in the request header matches the one in the cookie
 * Should be used on all state-changing routes (POST, PUT, DELETE)
 */
const csrfProtection = (req, res, next) => {
    // Only check for CSRF on state-changing methods
    const methodsToProtect = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!methodsToProtect.includes(req.method)) {
        return next();
    }
    // Skip CSRF check for API tokens (if your API supports token authentication)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return next();
    }
    const csrfCookie = req.cookies['XSRF-TOKEN'];
    const csrfHeader = req.headers['x-xsrf-token'];
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ error: 'CSRF validation failed' });
    }
    next();
};
exports.csrfProtection = csrfProtection;
