import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, _next) => {
  if (res.headersSent) {
    return _next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message =
    statusCode === 500 && env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'An unexpected error occurred';

  const requestId = req?.id || null;

  logger.error({
    err,
    requestId,
    method: req?.method,
    url: req?.originalUrl,
    statusCode,
  });

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    requestId,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
