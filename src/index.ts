import express, { Application, Request, Response, NextFunction } from 'express';
import { config } from './config';
import { apiRoutes, healthRoutes } from './routes';
import { cacheService, advisoryLockService } from './services';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`
    );
  });
  next();
});

// Routes
app.use('/', healthRoutes);
app.use('/api', apiRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');

  // Close services
  await cacheService.shutdown();
  await advisoryLockService.shutdown();

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Paper trading: ${config.PAPER_TRADING_ENABLED ? 'enabled' : 'disabled'}`);
});

export default app;
