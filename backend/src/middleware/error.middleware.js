/**
 * Global error handling middleware
 */

/**
 * Error response formatter
 * @param {Error} err - Error object
 * @returns {object} Formatted error response
 */
function formatError(err) {
  // Handle validation errors
  if (err.errors) {
    return {
      error: 'Validation Error',
      message: 'Invalid input data',
      details: err.errors,
    };
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return {
      error: 'Unauthorized',
      message: 'Invalid token',
    };
  }

  if (err.name === 'TokenExpiredError') {
    return {
      error: 'Unauthorized',
      message: 'Token expired',
    };
  }

  // Handle database errors
  if (err.code) {
    // Unique constraint violation
    if (err.code === '23505') {
      return {
        error: 'Conflict',
        message: 'Resource already exists',
      };
    }

    // Foreign key violation
    if (err.code === '23503') {
      return {
        error: 'Bad Request',
        message: 'Related resource not found',
      };
    }
  }

  // Default error
  return {
    error: err.name || 'Error',
    message: err.message || 'An unexpected error occurred',
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const formatted = formatError(err);

  // Include stack trace in development
  const response = {
    ...formatted,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
}

/**
 * Not found middleware
 */
export function notFound(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  errorHandler,
  notFound,
  asyncHandler,
};
