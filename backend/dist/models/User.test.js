"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const accountLockUtils_1 = require("../utils/accountLockUtils");
const jwtUtils_1 = require("../utils/jwtUtils");
const passwordUtils_1 = require("../utils/passwordUtils");
describe('Password Utils', () => {
    it('should hash and compare passwords correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        const password = 'testPassword123';
        const hash = yield (0, passwordUtils_1.hashPassword)(password);
        expect(yield (0, passwordUtils_1.comparePassword)(password, hash)).toBe(true);
        expect(yield (0, passwordUtils_1.comparePassword)('wrong', hash)).toBe(false);
    }));
});
describe('JWT Utils', () => {
    it('should generate and verify JWT tokens', () => {
        const payload = { id: 'user1', username: 'test', role: 'commentator' };
        const token = (0, jwtUtils_1.generateJWT)(payload);
        const decoded = (0, jwtUtils_1.verifyJWT)(token);
        expect(decoded.username).toBe('test');
        expect(decoded.role).toBe('commentator');
    });
    it('should return null for invalid tokens', () => {
        expect((0, jwtUtils_1.verifyJWT)('invalid.token')).toBeNull();
    });
});
describe('Account Lock Utils', () => {
    it('should lock account after max attempts', () => {
        expect((0, accountLockUtils_1.shouldLockAccount)(5)).toBe(true);
        expect((0, accountLockUtils_1.shouldLockAccount)(3)).toBe(false);
    });
    it('should return a future lockUntil date', () => {
        const lockUntil = (0, accountLockUtils_1.getLockUntil)();
        expect(lockUntil.getTime()).toBeGreaterThan(Date.now());
    });
});
