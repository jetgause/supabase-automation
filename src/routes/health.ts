import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /
 * Root endpoint
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Supabase Automation API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      alerts: 'POST /api/alerts',
      trades: 'POST /api/trades',
      positions: 'GET /api/positions',
      positionBySymbol: 'GET /api/positions/:symbol',
      cacheStats: 'GET /api/cache/stats',
      clearCache: 'DELETE /api/cache',
    },
  });
});

export default router;
