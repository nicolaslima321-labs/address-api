import { body, validationResult } from 'express-validator';

/**
 * Validation rules for the address validation endpoint
 */
export const validateAddressRules = [
  body('address')
    .exists({ checkFalsy: true })
    .withMessage('Address is required')
    .isString()
    .withMessage('Address must be a string')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Address must be at least 5 characters long')
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
];

/**
 * Middleware to handle validation errors
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
}
