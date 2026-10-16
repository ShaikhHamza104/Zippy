import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { errorTracker } from '../utils/errorTracker.js';

export const errorHandler = (err, req, res, _next) => {
  if (res.headersSent) {
    return _next(err);
  }

  let statusCode = err.statusCode || err.status;
  if (!statusCode) {
    if (err.name === 'MulterError' || err.code === 'INVALID_FILE_TYPE') {
      statusCode = 400;
    } else {
      statusCode = 500;
    }
  }
  const message =
    statusCode === 500 && env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'An unexpected error occurred';

  const requestId = req?.id || null;

  // Track 5xx and critical exceptions via errorTracker
  if (statusCode >= 500) {
    errorTracker.captureException(err, {
      requestId,
      method: req?.method,
      url: req?.originalUrl,
      statusCode,
      user: req?.user,
    });
  } else {
    logger.warn({
      err: err.message,
      requestId,
      method: req?.method,
      url: req?.originalUrl,
      statusCode,
    });
  }

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    requestId,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
