import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foosball';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      // useNewUrlParser and useUnifiedTopology are default in mongoose >=6
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
  connectDB();
});
