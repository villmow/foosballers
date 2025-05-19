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
exports.updateProfile = exports.createUser = exports.register = void 0;
const User_1 = require("../models/User");
// POST /api/users/register
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            res.status(400).json({ error: 'All fields are required' });
            return;
        }
        // Check for unique email
        const existing = yield User_1.UserModel.findOne({ email });
        if (existing) {
            res.status(409).json({ error: 'Email already in use' });
            return;
        }
        // Create user (default role: commentator)
        const user = new User_1.UserModel({ username, email, password, role: 'commentator' });
        yield user.save();
        // TODO: Send verification email here
        res.status(201).json({ message: 'Registration successful. Please verify your email.' });
    }
    catch (err) {
        res.status(500).json({ error: 'Registration failed' });
    }
});
exports.register = register;
// POST /api/users/create (admin only)
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existing = yield User_1.UserModel.findOne({ email });
        if (existing) {
            res.status(409).json({ error: 'Email already in use' });
            return;
        }
        const user = new User_1.UserModel({ username, email, password, role });
        yield user.save();
        // TODO: Send notification email to new user
        res.status(201).json({ message: 'User created successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'User creation failed' });
    }
});
exports.createUser = createUser;
// PUT /api/users/profile
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { username, email } = req.body;
        const user = yield User_1.UserModel.findById(req.user.id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        if (username)
            user.username = username;
        if (email)
            user.email = email;
        yield user.save();
        res.status(200).json({ message: 'Profile updated' });
    }
    catch (err) {
        res.status(500).json({ error: 'Profile update failed' });
    }
});
exports.updateProfile = updateProfile;
