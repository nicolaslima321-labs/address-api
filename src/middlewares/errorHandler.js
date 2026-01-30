/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Handle specific error types
  if (err.name === 'SyntaxError' && err.status === 400) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON in request body',
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
