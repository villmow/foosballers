import mongoose from 'mongoose';

export const handleMongoError = (err: any) => {
  console.error('MongoDB Error:', err);
};

mongoose.connection.on('error', handleMongoError);
