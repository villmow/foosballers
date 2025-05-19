export function shouldLockAccount(loginAttempts: number, lockUntil?: Date): boolean {
  const MAX_ATTEMPTS = 5;
  if (lockUntil && lockUntil > new Date()) return true;
  return loginAttempts >= MAX_ATTEMPTS;
}

export function getLockUntil(): Date {
  // Lock for 30 minutes
  const lock = new Date();
  lock.setMinutes(lock.getMinutes() + 30);
  return lock;
}
