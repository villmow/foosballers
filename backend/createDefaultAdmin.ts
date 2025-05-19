// This script creates a default admin user if one does not exist.
import { connectDB } from './config/database';
import { UserModel } from './models/User';

const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@foosball.local',
  password: 'admin1234', // Change after first login!
  role: 'administrator',
};

async function createDefaultAdmin() {
  await connectDB();
  const existing = await UserModel.findOne({ role: 'administrator' });
  if (existing) {
    console.log('Admin user already exists:', existing.email);
    process.exit(0);
  }
  const admin = new UserModel(DEFAULT_ADMIN);
  await admin.save();
  console.log('Default admin user created:', DEFAULT_ADMIN.email);
  process.exit(0);
}

createDefaultAdmin().catch((err) => {
  console.error('Error creating admin user:', err);
  process.exit(1);
});
