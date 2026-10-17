import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
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
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';
import { UPLOAD_ROOT } from './services/storage.service.js';

const app = express();

// Request identifier middleware
app.use(requestIdMiddleware);

// Request timeout protection (30s against slowloris attacks)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(504).json({
        status: 'error',
        message: 'Request timeout exceeded',
        requestId: req.id,
      });
    }
  });
  next();
});

// HTTP response compression (threshold: 1KB)
app.use(
  compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  })
);

// Security headers with cross-origin resource policy allowing media assets
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS configuration
const allowedOrigins = [
  ...env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  ...(env.CLIENT_URL ? [env.CLIENT_URL.trim()] : []),
].filter(Boolean);
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

// Cookie parsing middleware (required for reading refresh tokens)
app.use(cookieParser());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Body parsers with safe payload size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize query/body against NoSQL injection
app.use(
  mongoSanitize({
    allowDots: true,
    replaceWith: '_',
  })
);

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

// Static uploads serving
app.use('/uploads', express.static(UPLOAD_ROOT, { maxAge: '7d', immutable: true }));

// Versioned API v1 endpoints
app.use('/api/v1', v1Routes);

// OpenAPI/Swagger API documentation (toggleable in production)
const isSwaggerEnabled = env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true';
if (isSwaggerEnabled) {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Zippy API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
    })
  );
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
}

// 404 Not Found handler
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;
