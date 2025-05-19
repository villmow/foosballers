import { NextFunction, Request, Response } from 'express';
import { verifyJWT } from '../utils/jwtUtils';
import { isTokenBlacklisted } from '../services/tokenBlacklistService';

// Define interface for the request with user property
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

/**
 * Middleware to authenticate requests with JWT
 * Gets token from authorization header or cookie
 * Verifies token validity and adds user data to request
 */
export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Get token from authorization header or cookie
  let token: string | undefined;
  
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
  if (isTokenBlacklisted(token)) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Verify token
  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Add user data to request
  req.user = {
    id: decoded.id,
    username: decoded.username,
    role: decoded.role
  };

  next();
};
