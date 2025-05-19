import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRES_IN = '90m'; // 90 minutes session timeout

interface JWTPayload {
  id: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
  lastActivity?: number;
}

/**
 * Generates a JWT token for authentication
 * @param payload - User data to include in the token
 * @returns Signed JWT token
 */
export function generateJWT(payload: JWTPayload): string {
  const tokenPayload = {
    ...payload,
    lastActivity: Date.now() // Add last activity timestamp
  };
  
  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifies a JWT token and checks for session timeout
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
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
  } catch (err) {
    return null;
  }
}

/**
 * Generates a token specifically for password reset
 * @param userId - User ID to include in token
 * @returns Signed JWT token with 1 hour expiration
 */
export const generatePasswordResetToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour
};
