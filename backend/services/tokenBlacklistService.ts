/**
 * Simple in-memory token blacklist service
 * In a production environment, this should be replaced with a Redis-based solution
 * for better performance and distributed capabilities
 */

// Store for blacklisted tokens with expiration time
interface BlacklistedToken {
  token: string;
  expiresAt: Date;
}

// In-memory storage for blacklisted tokens
const blacklistedTokens: BlacklistedToken[] = [];

/**
 * Add a token to the blacklist
 * @param token The token to blacklist
 * @param expiresAt When the token expires (to clean up later)
 */
export const blacklistToken = (token: string, expiresAt: Date): void => {
  blacklistedTokens.push({ token, expiresAt });
  
  // Schedule cleanup of expired tokens periodically
  if (blacklistedTokens.length % 10 === 0) {
    cleanupExpiredTokens();
  }
};

/**
 * Check if a token is blacklisted
 * @param token The token to check
 * @returns boolean True if token is blacklisted
 */
export const isTokenBlacklisted = (token: string): boolean => {
  return blacklistedTokens.some(t => t.token === token);
};

/**
 * Remove expired tokens from the blacklist
 */
export const cleanupExpiredTokens = (): void => {
  const now = new Date();
  const validTokens = blacklistedTokens.filter(t => t.expiresAt > now);
  
  // Only perform array replacement if we actually removed something
  if (validTokens.length !== blacklistedTokens.length) {
    blacklistedTokens.splice(0, blacklistedTokens.length, ...validTokens);
  }
};
