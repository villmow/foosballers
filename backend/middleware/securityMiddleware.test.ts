import { NextFunction } from 'express';
import { csrfProtection, generateCsrfToken, securityHeaders } from './securityMiddleware';

describe('Security Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      path: '/test',
      method: 'GET',
      headers: {},
      cookies: {}
    };
    
    mockResponse = {
      set: jest.fn(),
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    nextFunction = jest.fn();
  });

  describe('securityHeaders', () => {
    test('should set security headers', () => {
      securityHeaders(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.set).toHaveBeenCalledWith({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': expect.any(String),
        'Referrer-Policy': 'same-origin',
        'Permissions-Policy': 'microphone=(), camera=()',
      });
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('generateCsrfToken', () => {
    test('should generate CSRF token for HTML requests', () => {
      generateCsrfToken(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        expect.any(String),
        expect.objectContaining({
          httpOnly: false,
          secure: false, // In test env, NODE_ENV is not 'production'
          sameSite: 'strict'
        })
      );
      expect(mockRequest.csrfToken).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });
    
    test('should skip token generation for API requests', () => {
      mockRequest.path = '/api/users';
      
      generateCsrfToken(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.cookie).not.toHaveBeenCalled();
      expect(mockRequest.csrfToken).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('csrfProtection', () => {
    test('should skip CSRF check for GET requests', () => {
      mockRequest.method = 'GET';
      
      csrfProtection(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
    
    test('should skip CSRF check for API token requests', () => {
      mockRequest.method = 'POST';
      mockRequest.headers.authorization = 'Bearer token';
      
      csrfProtection(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
    
    test('should return 403 if CSRF token is missing', () => {
      mockRequest.method = 'POST';
      
      csrfProtection(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'CSRF validation failed' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    test('should return 403 if CSRF tokens do not match', () => {
      mockRequest.method = 'POST';
      mockRequest.cookies['XSRF-TOKEN'] = 'cookie-token';
      mockRequest.headers['x-xsrf-token'] = 'header-token';
      
      csrfProtection(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'CSRF validation failed' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    test('should call next if CSRF tokens match', () => {
      mockRequest.method = 'POST';
      mockRequest.cookies['XSRF-TOKEN'] = 'valid-token';
      mockRequest.headers['x-xsrf-token'] = 'valid-token';
      
      csrfProtection(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
