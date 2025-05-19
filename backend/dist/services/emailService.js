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
exports.sendPasswordResetEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// This is a placeholder for a real email sending service.
// In a production environment, you would use a service like SendGrid, Mailgun, or AWS SES.
const transporter = nodemailer_1.default.createTransport({
    host: 'smtp.ethereal.email', // Using Ethereal for testing
    port: 587,
    auth: {
        user: 'ethereal_user', // Replace with your Ethereal username
        pass: 'ethereal_password', // Replace with your Ethereal password
    },
});
const sendPasswordResetEmail = (to, token) => __awaiter(void 0, void 0, void 0, function* () {
    const resetLink = `http://localhost:3000/reset-password?token=${token}`; // Adjust the frontend URL as needed
    const mailOptions = {
        from: '"Foosball App" <noreply@foosball.com>',
        to,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
        html: `<p>You requested a password reset. Click the link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
    };
    try {
        const info = yield transporter.sendMail(mailOptions);
        console.log('Password reset email sent: %s', info.messageId);
        // Preview URL for Ethereal: console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    catch (error) {
        console.error('Error sending password reset email:', error);
        // In a real app, you might want to throw this error or handle it more gracefully
    }
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
