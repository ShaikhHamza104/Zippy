// server/src/database/mongo.js
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let isConnected = false;

export const connectMongoDB = async (retryCount = 5, retryDelayMs = 2000) => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = env.MONGODB_URI || 'mongodb://localhost:27017/zippy_dev';

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      logger.info(`Connecting to MongoDB (attempt ${attempt}/${retryCount})...`);
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: env.NODE_ENV !== 'production',
      });

      isConnected = true;
      logger.info('Connected to MongoDB successfully');
      return mongoose.connection;
    } catch (err) {
      logger.error({ err, attempt }, `Failed to connect to MongoDB on attempt ${attempt}`);
      if (attempt === retryCount) {
        throw new Error(`MongoDB connection failed after ${retryCount} attempts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

export const disconnectMongoDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Disconnected from MongoDB');
  }
};

export default { connectMongoDB, disconnectMongoDB };
