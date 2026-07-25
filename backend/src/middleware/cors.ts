/**
 * CORS Origin Allowlist
 *
 * Restricts cross-origin access to an environment-driven allowlist and answers
 * disallowed origins with a 403 rather than letting the rejection surface as a 500.
 *
 * Features:
 *   - Reads ALLOWED_ORIGINS (comma-separated); falls back to the local dev ports
 *   - Requests with no Origin header pass through (mobile apps, curl, health checks)
 *   - Rejects ahead of cors(), which ends the chain on preflight and would
 *     otherwise hide a blocked OPTIONS behind a 204
 *
 * Usage:
 *   app.use(...createCorsMiddleware());
 */
import cors from 'cors';
import { RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

const DEFAULT_ORIGINS = 'http://localhost:3000,http://localhost:3001,http://localhost:4000';

export function parseAllowedOrigins(value = process.env.ALLOWED_ORIGINS): string[] {
  return (value || DEFAULT_ORIGINS)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function createCorsMiddleware(
  allowedOrigins: string[] = parseAllowedOrigins()
): RequestHandler[] {
  const rejectDisallowedOrigin: RequestHandler = (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      logger.warn('Blocked request from disallowed origin', { origin, path: req.path });
      // Fixed message: never reflect the rejected origin into the response body.
      res.status(403).json({ error: 'Origin not allowed by CORS policy' });
      return;
    }
    next();
  };

  return [rejectDisallowedOrigin, cors({ origin: allowedOrigins })];
}
