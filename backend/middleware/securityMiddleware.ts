import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Set security headers for all responses
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
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

interface CSRFRequest extends Request {
  csrfToken?: string;
}

/**
 * CSRF token generation
 */
export const generateCsrfToken = (req: CSRFRequest, res: Response, next: NextFunction) => {
  // Skip for non-HTML responses or for specific paths
  if (req.path.startsWith('/api/') || req.path.endsWith('.json')) {
    return next();
  }

  // Generate random CSRF token
  const token = crypto.randomBytes(32).toString('hex');
  
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

/**
 * CSRF Protection middleware
 * Verifies that the CSRF token in the request header matches the one in the cookie
 * Should be used on all state-changing routes (POST, PUT, DELETE)
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Only check for CSRF on state-changing methods
  const methodsToProtect = ['POST', 'PUT', 'DELETE', 'PATCH'];

  // Skip CSRF for login and password reset endpoints
  const csrfExemptPaths = [
    '/api/auth/login',
    '/api/auth/forgot-password',
    /^\/api\/auth\/reset-password\//
  ];
  if (
    csrfExemptPaths.some((p) =>
      typeof p === 'string' ? req.path === p : p instanceof RegExp && p.test(req.path)
    )
  ) {
    return next();
  }

  if (!methodsToProtect.includes(req.method)) {
    return next();
  }
  
  // Skip CSRF check for API tokens (if your API supports token authentication)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }
  
  const csrfCookie = req.cookies['XSRF-TOKEN'];
  const csrfHeader = req.headers['x-xsrf-token'] as string;
  
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  
  next();
};
