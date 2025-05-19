"use strict";
/**
 * Simple in-memory token blacklist service
 * In a production environment, this should be replaced with a Redis-based solution
 * for better performance and distributed capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredTokens = exports.isTokenBlacklisted = exports.blacklistToken = void 0;
// In-memory storage for blacklisted tokens
const blacklistedTokens = [];
/**
 * Add a token to the blacklist
 * @param token The token to blacklist
 * @param expiresAt When the token expires (to clean up later)
 */
const blacklistToken = (token, expiresAt) => {
    blacklistedTokens.push({ token, expiresAt });
    // Schedule cleanup of expired tokens periodically
    if (blacklistedTokens.length % 10 === 0) {
        (0, exports.cleanupExpiredTokens)();
    }
};
exports.blacklistToken = blacklistToken;
/**
 * Check if a token is blacklisted
 * @param token The token to check
 * @returns boolean True if token is blacklisted
 */
const isTokenBlacklisted = (token) => {
    return blacklistedTokens.some(t => t.token === token);
};
exports.isTokenBlacklisted = isTokenBlacklisted;
/**
 * Remove expired tokens from the blacklist
 */
const cleanupExpiredTokens = () => {
    const now = new Date();
    const validTokens = blacklistedTokens.filter(t => t.expiresAt > now);
    // Only perform array replacement if we actually removed something
    if (validTokens.length !== blacklistedTokens.length) {
        blacklistedTokens.splice(0, blacklistedTokens.length, ...validTokens);
    }
};
exports.cleanupExpiredTokens = cleanupExpiredTokens;
