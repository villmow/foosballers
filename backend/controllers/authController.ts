import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/authMiddleware';
import { IUser, UserModel } from '../models/User'; // Corrected: UserModel is the exported model
import { sendPasswordResetEmail } from '../services/emailService';
import { blacklistToken } from '../services/tokenBlacklistService';
import { generatePasswordResetToken } from '../utils/jwtUtils';
import { comparePassword } from '../utils/passwordUtils';

// Controller for handling user authentication

/**
 * Endpoint for user login
 * Authenticates user credentials and returns a JWT token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Find user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check if account is locked
    if (user.loginAttempts >= 5 && user.lockUntil && user.lockUntil > new Date()) {
      res.status(401).json({
        message: 'Account is locked. Try again later or reset your password.',
        lockUntil: user.lockUntil
      });
      return;
    }

    // Check password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      // Increment login attempts on failed login
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      }
      
      await user.save();
      
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '90m' } // 90 minutes token expiry
    );

    // Set cookie with the token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 60 * 1000 // 90 minutes in milliseconds
    });

    // Send response
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
};

/**
 * Endpoint for user logout
 * Invalidates the token by adding it to a blacklist and clearing the cookie
 * This implementation uses HTTP-only cookies for token storage and management
 */
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let token: string | undefined;
    
    // Get token from cookie or authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If token exists, blacklist it
    if (token) {
      // Get token expiry from payload
      const decoded = jwt.decode(token);
      let expiryDate: Date;
      
      if (decoded && typeof decoded !== 'string' && decoded.exp) {
        // Convert expiration time to Date object
        expiryDate = new Date(decoded.exp * 1000);
      } else {
        // If can't decode, set a default expiry (1 hour from now)
        expiryDate = new Date(Date.now() + 3600000);
      }
      
      // Add token to blacklist with expiry time - if this fails, it will be caught by the outer try/catch
      blacklistToken(token, expiryDate);
    }

    // Clear the token cookie regardless of whether we successfully blacklisted
    res.cookie('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0) // Set expiration to epoch time (invalidates immediately)
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error during logout' });
  }
};

/**
 * Endpoint for requesting a password reset
 * Generates a password reset token and sends it to the user's email
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  try {
    const user: IUser | null = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const token = generatePasswordResetToken((user._id as { toString: () => string }).toString());
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour from now
    await user.save();

    await sendPasswordResetEmail(user.email, token);

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; iat: number; exp: number };

    const user = await UserModel.findOne({
      _id: decoded.id,
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
      return;
    }

    // Set the new password
    user.password = password;
    user.passwordResetToken = undefined; // Clear the reset token fields
    user.passwordResetExpires = undefined;
    await user.save();

    // Optionally, log the user in or send a confirmation email
    res.status(200).json({ message: 'Password has been reset successfully.' });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(400).json({ message: 'Invalid token.' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(400).json({ message: 'Token has expired.' });
      return;
    }
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
