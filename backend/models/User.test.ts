import { getLockUntil, shouldLockAccount } from '../utils/accountLockUtils';
import { generateJWT, verifyJWT } from '../utils/jwtUtils';
import { comparePassword, hashPassword } from '../utils/passwordUtils';

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
    expect(decoded.username).toBe('test');
    expect(decoded.role).toBe('commentator');
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
