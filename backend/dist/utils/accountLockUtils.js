"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldLockAccount = shouldLockAccount;
exports.getLockUntil = getLockUntil;
function shouldLockAccount(loginAttempts, lockUntil) {
    const MAX_ATTEMPTS = 5;
    if (lockUntil && lockUntil > new Date())
        return true;
    return loginAttempts >= MAX_ATTEMPTS;
}
function getLockUntil() {
    // Lock for 30 minutes
    const lock = new Date();
    lock.setMinutes(lock.getMinutes() + 30);
    return lock;
}
