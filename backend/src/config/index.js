// ============================================================
// HAYAT API — Configuration
// ============================================================
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Generate random fallback for dev only — never use in prod
const devFallbackSecret = (label) => {
  const fallback = crypto.randomBytes(32).toString('hex');
  if (isProduction) {
    console.error(`\n❌ FATAL: ${label} environment variable is required in production!\n`);
    process.exit(1);
  }
  return fallback;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'hayat_db',
    user: process.env.DB_USER || 'hayat_user',
    password: process.env.DB_PASSWORD || 'hayat_secret',
    pool: { min: 2, max: 20 },
  },

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || devFallbackSecret('JWT_ACCESS_SECRET'),
    refreshSecret: process.env.JWT_REFRESH_SECRET || devFallbackSecret('JWT_REFRESH_SECRET'),
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },

  // Redis (for caching & rate limiting)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // CORS
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000,   // 15 min
    maxRequests: 100,
    authMaxRequests: 10,          // stricter for auth endpoints
  },

  // AI (Anthropic Claude)
  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: 1024,
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
};

// Startup warnings
if (!isProduction) {
  const warnings = [];
  if (!process.env.JWT_ACCESS_SECRET) warnings.push('JWT_ACCESS_SECRET');
  if (!process.env.JWT_REFRESH_SECRET) warnings.push('JWT_REFRESH_SECRET');
  if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'hayat_secret') warnings.push('DB_PASSWORD');
  if (warnings.length > 0) {
    console.warn(`\n⚠️  DEV MODE: Şu secret'lar varsayılan değerde → ${warnings.join(', ')}`);
    console.warn('   Production\'da .env dosyasından güçlü değerler ayarlayın!\n');
  }
}

export default config;
