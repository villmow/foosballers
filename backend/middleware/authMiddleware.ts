import { NextFunction, Request, Response } from 'express';
import { isTokenBlacklisted } from '../services/tokenBlacklistService';
import { verifyJWT } from '../utils/jwtUtils';

// Define interface for the request with user property
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    lastActivity?: Date; // Add lastActivity for session timeout
  };
}

/**
 * Middleware to authenticate requests with JWT
 * Gets token from authorization header or cookie
 * Verifies token validity and adds user data to request
 */
export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
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
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Verify token
  const decoded = verifyJWT(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid token' });
    return;
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

/**
 * Middleware to protect routes that require authentication
 * Must be used after authenticateJWT middleware
 */
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  // Update last activity timestamp
  req.user.lastActivity = new Date();
  
  next();
};

/**
 * Middleware for role-based authorization
 * @param allowedRoles - Array of roles allowed to access the route
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Middleware to enforce session timeout after inactivity
 * Checks if the last activity was within the allowed timeframe (90 minutes)
 */
export const sessionTimeout = (req: AuthRequest, res: Response, next: NextFunction): void => {
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
    res.status(440).json({ error: 'Session expired', reason: 'inactivity' });
    return;
  }

  // Update last activity time
  req.user.lastActivity = currentTime;
  next();
};

/**
 * Middleware to log authentication events
 */
export const logAuthEvents = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Clone the response
  const oldSend = res.send;
  
  res.send = function(data): Response {
    // Log based on response status
    const authEvent = {
      timestamp: new Date(),
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || 'unauthenticated',
      username: req.user?.username || 'unauthenticated',
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
