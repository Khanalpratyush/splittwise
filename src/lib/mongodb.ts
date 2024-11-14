import mongoose from 'mongoose';
import logger from '@/utils/logger';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  logger.error('MONGODB_URI is not defined in environment variables');
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    logger.db('Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    logger.db('Creating new database connection');
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        logger.db('Successfully connected to MongoDB');
        return mongoose.connection;
      })
      .catch((error) => {
        logger.error('Failed to connect to MongoDB', error);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    logger.error('Error while getting cached connection', e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Log database disconnection
mongoose.connection.on('disconnected', () => {
  logger.warn('Lost MongoDB connection');
});

// Log database reconnection
mongoose.connection.on('reconnected', () => {
  logger.info('Reconnected to MongoDB');
});

export default connectDB; 