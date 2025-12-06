import { Request, Response, NextFunction } from 'express';
import { apiKeyAuthService } from '../services';

/**
 * Middleware to validate API key authentication
 * Expects API key in Authorization header: "Bearer <api-key>"
 */
export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected: Bearer <api-key>',
    });
    return;
  }

  const apiKey = parts[1];

  if (!apiKeyAuthService.validateApiKey(apiKey)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
    return;
  }

  // API key is valid, proceed
  next();
};

/**
 * Optional authentication middleware
 * Allows requests without API key but validates if present
 */
export const optionalApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected: Bearer <api-key>',
    });
    return;
  }

  const apiKey = parts[1];

  if (!apiKeyAuthService.validateApiKey(apiKey)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
    return;
  }

  next();
};
