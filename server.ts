import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { securityHeadersMiddleware, createRateLimiter, validateVideoUrlServer } from './server/security';
import adminRoutes from './server/routes/admin';
import communityRoutes from './server/routes/community';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for secure headers & accurate client IP behind nginx/Cloud Run
  app.set('trust proxy', 1);

  // 1. Mount Production Security HTTP Headers
  app.use(securityHeadersMiddleware);

  // 2. Request body parsing with strict 1MB size limit to prevent memory exhaustion DoS
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 3. General API rate limiter (200 requests per minute per IP)
  const apiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 200,
    message: 'Too many API requests from this IP. Please try again in a minute.',
  });
  app.use('/api', apiLimiter);

  // 4. API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'ZYNOX Anime Backend',
      timestamp: new Date().toISOString(),
    });
  });

  // Public video URL validation endpoint
  app.post('/api/validate-video-url', (req, res) => {
    const { url } = req.body || {};
    res.json(validateVideoUrlServer(url));
  });

  // Privileged Admin API routes (server-side token verification and authorization)
  app.use('/api/admin', adminRoutes);

  // Community Submission API routes (rate-limited and sanitized)
  app.use('/api', communityRoutes);

  // 5. Global safe error handling middleware (Never leak technical stack traces to clients)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('[UNCAUGHT SERVER ERROR]:', err);

    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    res.status(statusCode).json({
      error: 'An internal server error occurred. Please try again later.',
      code: 'SERVER_ERROR',
    });
  });

  // 6. Vite middleware for development / Static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ZYNOX SECURITY] Full-stack server running securely on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
