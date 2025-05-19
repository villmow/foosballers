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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const authController_1 = require("../controllers/authController");
const tokenBlacklistService_1 = require("../services/tokenBlacklistService");
// Mock the token blacklist service
jest.mock('../services/tokenBlacklistService', () => ({
    isTokenBlacklisted: jest.fn(),
    blacklistToken: jest.fn()
}));
describe('Auth Controller - Logout', () => {
    let app;
    beforeEach(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((0, cookie_parser_1.default)());
        app.post('/api/auth/logout', authController_1.logout);
        // Reset mocks
        jest.resetAllMocks();
    });
    it('should clear the token cookie and return success message', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app)
            .post('/api/auth/logout')
            .set('Cookie', ['token=test-token']);
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ message: 'Logged out successfully' });
        // Check that cookie was cleared
        const cookies = response.headers['set-cookie'][0];
        expect(cookies).toMatch(/token=;/);
        expect(cookies).toMatch(/Expires=Thu, 01 Jan 1970/);
    }));
    it('should blacklist a token from authorization header', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app)
            .post('/api/auth/logout')
            .set('Authorization', 'Bearer test-token-from-header');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ message: 'Logged out successfully' });
        expect(tokenBlacklistService_1.blacklistToken).toHaveBeenCalled();
    }));
    it('should handle errors gracefully', () => __awaiter(void 0, void 0, void 0, function* () {
        // Mock implementation to throw an error
        tokenBlacklistService_1.blacklistToken.mockImplementation(() => {
            throw new Error('Test error');
        });
        const response = yield (0, supertest_1.default)(app)
            .post('/api/auth/logout')
            .set('Authorization', 'Bearer test-token');
        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({ error: 'Internal server error during logout' });
    }));
});
