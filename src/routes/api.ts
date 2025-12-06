import { Router, Request, Response } from 'express';
import { authenticateApiKey } from '../middleware';
import { validateBody } from '../middleware';
import { alertPayloadSchema, tradingParamsSchema } from '../validators';
import { paperTradingService, cacheService } from '../services';

const router = Router();

/**
 * POST /api/alerts
 * Receive trading alerts and execute paper trades
 */
router.post(
  '/alerts',
  authenticateApiKey,
  validateBody(alertPayloadSchema),
  async (req: Request, res: Response) => {
    try {
      const alert = req.body;

      // Map alert action to trade side
      let side: 'buy' | 'sell';
      if (alert.action === 'buy') {
        side = 'buy';
      } else if (alert.action === 'sell') {
        side = 'sell';
      } else if (alert.action === 'close') {
        // Close position
        const trade = await paperTradingService.closePosition(
          alert.symbol,
          alert.price || 0
        );
        if (trade) {
          res.json({
            success: true,
            message: 'Position closed',
            trade,
          });
        } else {
          res.json({
            success: false,
            message: 'No position to close',
          });
        }
        return;
      } else {
        res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be buy, sell, or close',
        });
        return;
      }

      // Execute trade
      const trade = await paperTradingService.executeTrade(
        alert.symbol,
        side,
        alert.quantity,
        alert.price || 0
      );

      res.json({
        success: true,
        message: 'Trade executed',
        trade,
      });
    } catch (error) {
      console.error('Alert processing error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to process alert',
      });
    }
  }
);

/**
 * POST /api/trades
 * Execute a paper trade
 */
router.post(
  '/trades',
  authenticateApiKey,
  validateBody(tradingParamsSchema),
  async (req: Request, res: Response) => {
    try {
      const params = req.body;

      const trade = await paperTradingService.executeTrade(
        params.symbol,
        params.side,
        params.quantity,
        params.price || 0
      );

      res.json({
        success: true,
        trade,
      });
    } catch (error) {
      console.error('Trade execution error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to execute trade',
      });
    }
  }
);

/**
 * GET /api/positions
 * Get all current positions
 */
router.get('/positions', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    const positions = await paperTradingService.getAllPositions();
    res.json({
      success: true,
      positions,
    });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve positions',
    });
  }
});

/**
 * GET /api/positions/:symbol
 * Get position for a specific symbol
 */
router.get('/positions/:symbol', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const position = await paperTradingService.getPositionBySymbol(symbol.toUpperCase());

    if (position) {
      res.json({
        success: true,
        position,
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: `No position found for symbol: ${symbol}`,
      });
    }
  } catch (error) {
    console.error('Get position error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve position',
    });
  }
});

/**
 * DELETE /api/cache
 * Clear all caches
 */
router.delete('/cache', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    await cacheService.clear();
    res.json({
      success: true,
      message: 'Cache cleared',
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to clear cache',
    });
  }
});

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', authenticateApiKey, async (_req: Request, res: Response) => {
  try {
    const stats = cacheService.getStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve cache stats',
    });
  }
});

export default router;
