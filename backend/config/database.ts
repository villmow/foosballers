import mongoose from 'mongoose';
import { GoalModel } from '../models/Goal';
import { MatchModel } from '../models/Match';
import { SetModel } from '../models/Set';
import { TeamModel } from '../models/Team';
import { TimeoutModel } from '../models/Timeout';
import { UserModel } from '../models/User';

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/foosball';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 1000; // 1 second

let retries = 0;

async function initializeDatabase() {
  // Ensure indexes for all main models
  await Promise.all([
    UserModel.ensureIndexes(),
    MatchModel.ensureIndexes(),
    SetModel.ensureIndexes(),
    GoalModel.ensureIndexes(),
    TimeoutModel.ensureIndexes(),
    TeamModel.ensureIndexes(),
  ]);
  console.log('Database indexes ensured.');
}

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      // useNewUrlParser and useUnifiedTopology are default in mongoose >=6
      // poolSize is managed automatically, but can be set via options if needed
      // maxPoolSize: 10,
    });
    console.log('MongoDB connected');
    retries = 0;
    await initializeDatabase();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    if (retries < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF * Math.pow(2, retries);
      retries++;
      console.log(`Retrying MongoDB connection in ${backoff / 1000}s (attempt ${retries}/${MAX_RETRIES})...`);
      setTimeout(connectDB, backoff);
    } else {
      console.error('Max MongoDB connection retries reached. Exiting.');
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
  connectDB();
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established.');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err);
});
