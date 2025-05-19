import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserModel } from '../models/User';

// POST /api/users/register
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }
    // Check for unique email
    const existing = await UserModel.findOne({ email });
    if (existing) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    // Create user (default role: commentator)
    const user = new UserModel({ username, email, password, role: 'commentator' });
    await user.save();
    // TODO: Send verification email here
    res.status(201).json({ message: 'Registration successful. Please verify your email.' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /api/users/create (admin only)
export const createUser = async (req: AuthRequest, res: Response) => {
  console.log('DEBUG createUser req.user:', req.user); // Debug log
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password || !role) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }
    // Only admin can create
    if (!req.user || req.user.role !== 'administrator') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    // Check for unique email
    const existing = await UserModel.findOne({ email });
    if (existing) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    const user = new UserModel({ username, email, password, role });
    await user.save();
    // TODO: Send notification email to new user
    res.status(201).json({ message: 'User created successfully' });
  } catch (err: any) { // Added :any to type err for logging
    console.error('ERROR in createUser:', err); // More detailed error logging
    res.status(500).json({ error: 'User creation failed', details: err.message || err.toString() }); // Optionally send details to client
  }
};

// PUT /api/users/profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { username, email } = req.body;
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (username) user.username = username;
    if (email) user.email = email;
    await user.save();
    res.status(200).json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
};
