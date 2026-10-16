import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import healthRoutes from './routes/health.routes.js';
import v1Routes from './routes/v1/index.js';

const app = express();

// Request identifier middleware
app.use(requestIdMiddleware);

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman/Bruno)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Body parsers with safe payload size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Pino HTTP request logging (suppressed during unit test runs)
if (env.NODE_ENV !== 'test') {
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );
}

// Health and readiness endpoints
app.use('/', healthRoutes);

// Versioned API v1 endpoints
app.use('/api/v1', v1Routes);

// 404 Not Found handler
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;
