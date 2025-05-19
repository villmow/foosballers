"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMongoError = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const handleMongoError = (err) => {
    console.error('MongoDB Error:', err);
};
exports.handleMongoError = handleMongoError;
mongoose_1.default.connection.on('error', exports.handleMongoError);
