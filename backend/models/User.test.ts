import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { getLockUntil, shouldLockAccount } from '../utils/accountLockUtils';
import { generateJWT, verifyJWT } from '../utils/jwtUtils';
import { comparePassword, hashPassword } from '../utils/passwordUtils';
import { UserModel } from './User';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Model', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  it('should successfully create a valid user', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      role: 'commentator' as const,
    };

    const user = new UserModel(userData);
    await user.save();

    const savedUser = await UserModel.findOne({ email: 'test@example.com' });
    expect(savedUser).not.toBeNull();
    expect(savedUser?.username).toBe('testuser');
    expect(savedUser?.role).toBe('commentator');
  });

  it('should reject users with invalid email format', async () => {
    const userData = {
      username: 'testuser',
      email: 'invalid-email',
      password: 'Password123',
      role: 'commentator' as const,
    };

    try {
      const user = new UserModel(userData);
      await user.save();
      fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.email).toBeDefined();
    }
  });

  it('should hash password on save', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      role: 'commentator' as const,
    };

    const user = new UserModel(userData);
    await user.save();

    const savedUser = await UserModel.findOne({ email: 'test@example.com' });
    expect(savedUser?.password).not.toBe('Password123');
    expect(await savedUser?.comparePassword('Password123')).toBe(true);
    expect(await savedUser?.comparePassword('WrongPassword')).toBe(false);
  });

  it('should generate a valid JWT token', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      role: 'commentator' as const,
    };

    const user = new UserModel(userData);
    await user.save();

    const token = user.generateJWT();
    expect(token).toBeDefined();
    
    const decoded = verifyJWT(token);
    expect(decoded).not.toBeNull();
    if (decoded) {
      expect(decoded.username).toBe('testuser');
      expect(decoded.role).toBe('commentator');
    }
  });

  it('should identify locked accounts', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      role: 'commentator' as const,
      loginAttempts: 5,
      lockUntil: new Date(Date.now() + 10000) // 10 seconds in the future
    };

    const user = new UserModel(userData);
    await user.save();

    expect(user.isAccountLocked()).toBe(true);

    // Set lockUntil to the past
    user.lockUntil = new Date(Date.now() - 10000);
    expect(user.isAccountLocked()).toBe(false);
  });

  it('should exclude sensitive fields when converting to JSON', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      role: 'commentator' as const,
      passwordResetToken: 'token123',
      refreshToken: 'refresh123'
    };

    const user = new UserModel(userData);
    await user.save();

    const userJson = user.toJSON();
    expect(userJson.password).toBeUndefined();
    expect(userJson.passwordResetToken).toBeUndefined();
    expect(userJson.refreshToken).toBeUndefined();
  });
});

describe('Password Utils', () => {
  it('should hash and compare passwords correctly', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    expect(await comparePassword(password, hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });
});

describe('JWT Utils', () => {
  it('should generate and verify JWT tokens', () => {
    const payload = { id: 'user1', username: 'test', role: 'commentator' };
    const token = generateJWT(payload);
    const decoded = verifyJWT(token);
    expect(decoded?.username).toBe('test');
    expect(decoded?.role).toBe('commentator');
  });

  it('should return null for invalid tokens', () => {
    expect(verifyJWT('invalid.token')).toBeNull();
  });
});

describe('Account Lock Utils', () => {
  it('should lock account after max attempts', () => {
    expect(shouldLockAccount(5)).toBe(true);
    expect(shouldLockAccount(3)).toBe(false);
  });

  it('should return a future lockUntil date', () => {
    const lockUntil = getLockUntil();
    expect(lockUntil.getTime()).toBeGreaterThan(Date.now());
  });
});
