import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'commentator' | 'administrator';
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshToken?: string;
  comparePassword(candidate: string): Promise<boolean>;
  generateJWT(): string;
  isAccountLocked(): boolean;
}

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Username validation - alphanumeric, underscores, hyphens, 3-20 chars
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;
// Password strength (8+ chars, at least one uppercase, lowercase, number)
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

const UserSchema = new Schema<IUser>({
  username: { 
    type: String, 
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [USERNAME_REGEX, 'Username can only contain letters, numbers, underscores and hyphens']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    trim: true,
    lowercase: true,
    match: [EMAIL_REGEX, 'Please provide a valid email address']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  role: { 
    type: String, 
    enum: {
      values: ['commentator', 'administrator'],
      message: '{VALUE} is not a valid role'
    },
    required: [true, 'User role is required'], 
    default: 'commentator'
  },
  firstName: { 
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: { 
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  avatarUrl: { 
    type: String 
  },
  lastLogin: { 
    type: Date 
  },
  loginAttempts: { 
    type: Number, 
    default: 0,
    min: 0
  },
  lockUntil: { 
    type: Date 
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  passwordResetToken: { 
    type: String 
  },
  passwordResetExpires: { 
    type: Date 
  },
  refreshToken: {
    type: String
  }
});

// Add indexes for performance optimization
// UserSchema.index({ email: 1 });
// UserSchema.index({ username: 1 });
// UserSchema.index({ createdAt: -1 });

// Set up updatedAt timestamp on save
UserSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Password hashing middleware
UserSchema.pre('save', async function(next) {
  const user = this as IUser;
  
  // Only hash if password is modified or new
  if (!user.isModified('password')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(12);
    // Hash the password
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to check if a user account is locked
UserSchema.methods.isAccountLocked = function(): boolean {
  // Check if lockUntil exists and is in the future
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Method to compare password
UserSchema.methods.comparePassword = async function(candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Method to generate JWT token
UserSchema.methods.generateJWT = function(): string {
  return jwt.sign(
    { 
      id: this._id, 
      username: this.username, 
      role: this.role,
      lastActivity: Date.now()
    },
    process.env.JWT_SECRET || 'devsecret',
    { expiresIn: '90m' }  // 90 minutes token expiry
  );
};

// Virtual getter for full name
UserSchema.virtual('fullName').get(function() {
  if (!this.firstName && !this.lastName) return undefined;
  if (!this.firstName) return this.lastName;
  if (!this.lastName) return this.firstName;
  return `${this.firstName} ${this.lastName}`;
});

// When converting to JSON, always exclude sensitive fields
UserSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.refreshToken;
    return ret;
  },
  virtuals: true
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);
