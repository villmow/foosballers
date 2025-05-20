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