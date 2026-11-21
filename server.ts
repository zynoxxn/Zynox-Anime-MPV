import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { securityHeadersMiddleware, createRateLimiter, validateVideoUrlServer } from './server/security';
import adminRoutes from './server/routes/admin';
import communityRoutes from './server/routes/community';
import driveAvatarsRouter from './server/routes/drive-avatars';

function resolvePort(): number {
  const portFlagIndex = process.argv.indexOf('--port');
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    const parsedFlag = parseInt(process.argv[portFlagIndex + 1], 10);
    if (Number.isFinite(parsedFlag) && parsedFlag > 0) return parsedFlag;
  }
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
  return Number.isFinite(envPort) && envPort > 0 ? envPort : 3000;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = resolvePort();
  let viteServer: ViteDevServer | null = null;

  // Prevent transient socket/abort errors during pre-warming from crashing the dev server
  process.on('unhandledRejection', (reason) => {
    console.error('[SERVER UNHANDLED REJECTION]:', reason);
  });
  process.on('uncaughtException', (err: any) => {
    const code = err?.code || '';
    if (code === 'ECONNRESET' || code === 'EPIPE' || code === 'ERR_STREAM_PREMATURE_CLOSE') {
      return;
    }
    console.error('[SERVER UNCAUGHT EXCEPTION]:', err);
  });

  // Trust proxy for secure headers & accurate client IP behind nginx/Cloud Run
  app.set('trust proxy', 1);

  // 1. Mount Production Security HTTP Headers
  app.use(securityHeadersMiddleware);

  // 2. Request body parsing (15mb limit to support direct image upload proxying for posters and banners)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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

  // Google Drive Profile Pictures (PFPs) API route
  app.use('/api/drive-avatars', driveAvatarsRouter);

  // Dynamic SEO endpoints (/robots.txt and /sitemap.xml)
  app.get('/robots.txt', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.type('text/plain');
    res.send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api/admin',
        '',
        `Sitemap: ${origin}/sitemap.xml`,
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const today = new Date().toISOString().split('T')[0];
    const staticRoutes = [
      { path: '/', changefreq: 'daily', priority: '1.0' },
      { path: '/browse', changefreq: 'daily', priority: '0.9' },
      { path: '/schedule', changefreq: 'daily', priority: '0.8' },
      { path: '/requests', changefreq: 'weekly', priority: '0.6' },
      { path: '/about', changefreq: 'monthly', priority: '0.4' },
      { path: '/dmca', changefreq: 'monthly', priority: '0.3' },
      { path: '/terms', changefreq: 'monthly', priority: '0.3' },
      { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
    ];
    const urls = staticRoutes
      .map(
        (r) =>
          `  <url>\n    <loc>${origin}${r.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
      )
      .join('\n');
    res.type('application/xml');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
    );
  });

  // 5. Vite middleware for development / Static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const hmrConfig =
      process.env.DISABLE_HMR === 'true'
        ? false
        : { server: httpServer };

    viteServer = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrConfig,
      },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 6. Global safe error handling middleware (mounted after routes & Vite middleware)
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

  let listenRetries = 0;
  httpServer.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE' && listenRetries < 5) {
      listenRetries++;
      console.warn(`[SERVER] Port ${PORT} busy, retrying (${listenRetries}/5)...`);
      setTimeout(() => {
        httpServer.close(() => {
          httpServer.listen(PORT, '0.0.0.0');
        });
      }, 400);
      return;
    }
    console.error('[SERVER LISTEN ERROR]:', err);
    process.exit(1);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[ZYNOX SECURITY] Full-stack server running securely on port ${PORT}`);
  });

  const shutdown = async () => {
    try {
      if (viteServer) {
        await viteServer.close();
      }
    } catch {
      // ignore close errors
    }
    httpServer.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1500).unref();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
