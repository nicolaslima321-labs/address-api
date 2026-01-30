import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { validateAddressHandler, healthCheck } from './controllers/addressController.js';
import { validateAddressRules, handleValidationErrors } from './validators/addressValidator.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

/**
 * Creates and configures the Express application
 */
export function createApp() {
  const app = express();

  // Security middlewares
  app.use(helmet());
  app.use(cors());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    message: {
      status: 'error',
      message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: '10kb' }));

  // Routes
  app.get('/health', healthCheck);

  app.post(
    '/validate-address',
    validateAddressRules,
    handleValidationErrors,
    validateAddressHandler,
  );

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
