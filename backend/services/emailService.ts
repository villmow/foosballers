import nodemailer from 'nodemailer';

// This is a placeholder for a real email sending service.
// In a production environment, you would use a service like SendGrid, Mailgun, or AWS SES.
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email', // Using Ethereal for testing
  port: 587,
  auth: {
    user: 'ethereal_user', // Replace with your Ethereal username
    pass: 'ethereal_password', // Replace with your Ethereal password
  },
});

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const resetLink = `http://localhost:3000/reset-password?token=${token}`; // Adjust the frontend URL as needed

  const mailOptions = {
    from: '"Foosball App" <noreply@foosball.com>',
    to,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
    html: `<p>You requested a password reset. Click the link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent: %s', info.messageId);
    // Preview URL for Ethereal: console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending password reset email:', error);
    // In a real app, you might want to throw this error or handle it more gracefully
  }
};
