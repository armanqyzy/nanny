const rateLimit = require('express-rate-limit');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

function jsonRateLimit(options) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: options.message || 'Too many requests, please try again later.' });
    },
    ...options,
  });
}

// Broad API limit to slow down brute force and scraping.
const apiRateLimit = jsonRateLimit({
  windowMs: FIFTEEN_MINUTES,
  // 100 was too low: one dashboard visit makes ~10 requests, and a whole team
  // testing from one Wi-Fi shares one IP, so requests started failing "every other time".
  max: isProduction ? 1500 : 5000,
  message: 'Too many requests from this IP, please try again in 15 minutes.',
});

// Stricter auth limit, while skipSuccessfulRequests avoids punishing real users.
const authRateLimit = jsonRateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: isProduction ? 10 : 50,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.',
});

module.exports = {
  apiRateLimit,
  authRateLimit,
};
