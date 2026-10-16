import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message =
    statusCode === 500 && env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'An unexpected error occurred';

  logger.error({
    err,
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    statusCode,
  });

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    requestId: req.id,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
