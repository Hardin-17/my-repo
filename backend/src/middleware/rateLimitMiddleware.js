const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const isTest = config.nodeEnv === 'test';

/**
 * Authentication endpoints rate limiter (Login, Register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 30, // 30 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again after 15 minutes',
    },
  },
});

/**
 * AI Copilot chat rate limiter
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 1000 : 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many AI queries, please throttle requests',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many AI queries, please throttle requests',
    },
  },
});

/**
 * Chaos fault injection rate limiter
 */
const chaosLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 1000 : 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many chaos operations dispatched in short duration',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many chaos operations dispatched in short duration',
    },
  },
});

module.exports = {
  authLimiter,
  aiLimiter,
  chaosLimiter,
};
