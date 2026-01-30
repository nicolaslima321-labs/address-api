import { validateAddress } from '../services/addressValidationService.js';

/**
 * POST /validate-address
 * Validates and standardizes a property address
 */
export async function validateAddressHandler(req, res, next) {
  try {
    const { address } = req.body;

    const result = await validateAddress(address);

    // Determine HTTP status code based on validation result
    let httpStatus = 200;
    if (result.status === 'invalid') {
      httpStatus = 422; // Unprocessable Entity
    }

    res.status(httpStatus).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /health
 * Health check endpoint
 */
export function healthCheck(req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'address-validation-api',
    version: '1.0.0',
  });
}
