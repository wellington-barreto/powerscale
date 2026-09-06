import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { router } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'tiny'));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'POWER SCALE',
    runtime: process.env.VERCEL ? 'vercel-node' : 'node',
    version: '0.7.0'
  });
});

// Safe diagnostic endpoint: reports only whether configuration exists.
// It never returns environment variable values or secrets.
app.get('/api/debug/config', (_req, res) => {
  res.json({
    ok: true,
    vercel: Boolean(process.env.VERCEL),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    supabase: {
      urlConfigured: Boolean(process.env.SUPABASE_URL),
      anonKeyConfigured: Boolean(process.env.SUPABASE_ANON_KEY),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    appUrlConfigured: Boolean(process.env.APP_URL),
    productionUrlConfigured: Boolean(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  });
});

app.use('/api/v1', router);

// Local development only. On Vercel, public/** is served by the CDN.
if (!process.env.VERCEL) {
  app.use(express.static(publicDir, { index: false }));
}

// SPA fallback for React routes such as /dashboard/*.
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

export default app;
