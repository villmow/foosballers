"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const database_1 = require("./config/database");
const authMiddleware_1 = require("./middleware/authMiddleware");
const securityMiddleware_1 = require("./middleware/securityMiddleware");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Apply security headers to all responses
app.use(securityMiddleware_1.securityHeaders);
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        'http://frontend:3000',
        process.env.CORS_ORIGIN || '*'
    ],
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Authentication middleware
app.use(authMiddleware_1.authenticateJWT);
app.use(authMiddleware_1.sessionTimeout);
app.use(authMiddleware_1.logAuthEvents);
// CSRF protection 
app.use(securityMiddleware_1.generateCsrfToken);
app.use(securityMiddleware_1.csrfProtection);
// Connect to the database
(0, database_1.connectDB)();
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// API routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('message', (msg) => {
        io.emit('message', msg); // Broadcast to all clients
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
