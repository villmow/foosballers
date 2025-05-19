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
// This script creates a default admin user if one does not exist.
const database_1 = require("./config/database");
const User_1 = require("./models/User");
const DEFAULT_ADMIN = {
    username: 'admin',
    email: 'admin@foosball.local',
    password: 'admin1234', // Change after first login!
    role: 'administrator',
};
function createDefaultAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, database_1.connectDB)();
        const existing = yield User_1.UserModel.findOne({ role: 'administrator' });
        if (existing) {
            console.log('Admin user already exists:', existing.email);
            process.exit(0);
        }
        const admin = new User_1.UserModel(DEFAULT_ADMIN);
        yield admin.save();
        console.log('Default admin user created:', DEFAULT_ADMIN.email);
        process.exit(0);
    });
}
createDefaultAdmin().catch((err) => {
    console.error('Error creating admin user:', err);
    process.exit(1);
});
