// ============================================================
// HAYAT Life OS — API Server
// Express + PostgreSQL + JWT
// ============================================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import config from './config/index.js';
import { errorHandler } from './utils/errors.js';

// Routes
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import financeRoutes from './routes/finance.js';
import habitRoutes from './routes/habits.js';
import categoryRoutes from './routes/categories.js';
import notificationRoutes from './routes/notifications.js';
import aiRoutes from './routes/ai.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();

// ─── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging
if (config.env !== 'test') {
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
}

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Çok fazla istek' } },
});

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMaxRequests,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Çok fazla giriş denemesi' } },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Health Check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'hayat-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── API Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── 404 ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint bulunamadı' },
  });
});

// ─── Error Handler ──────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────
const PORT = config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════╗
║     🌟 HAYAT Life OS API Server 🌟      ║
║──────────────────────────────────────────║
║  Port:    ${String(PORT).padEnd(30)}║
║  Env:     ${String(config.env).padEnd(30)}║
║  Time:    ${new Date().toLocaleString('tr-TR').padEnd(30)}║
╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received. Shutting down...');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('[SERVER] Unhandled rejection:', err);
});

export default app;
