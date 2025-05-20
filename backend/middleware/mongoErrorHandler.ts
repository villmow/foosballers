import mongoose from 'mongoose';

export const handleMongoError = (err: any) => {
  console.error('MongoDB Error:', err);
};

mongoose.connection.on('error', handleMongoError);

export const mongoErrorHandler = (err: any, req: any, res: any, next: any) => {
  if (err && err.name && err.name.startsWith('Mongo')) {
    console.error('MongoDB Error:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
  next(err);
};
