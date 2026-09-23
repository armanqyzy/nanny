function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (status === 404) {
    console.warn('[api-404]', {
      method: req.method,
      path: req.originalUrl,
      message: err.message,
    });
  } else {
    console.error('[api-error]', {
      method: req.method,
      path: req.originalUrl,
      message: err.message,
      status,
      stack: err.stack,
    });
  }

  const includeStack = !isProduction && status !== 404;

  res.status(status).json({
    error: status >= 500 && isProduction ? 'Internal server error' : (err.message || 'Server error'),
    ...(includeStack ? { stack: err.stack } : {}),
  });
}

module.exports = {
  notFound,
  errorHandler,
};
