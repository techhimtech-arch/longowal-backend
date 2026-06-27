const { z } = require('zod');

/**
 * Environment variable schema with Zod validation
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).refine(n => n > 0 && n < 65536, {
    message: 'PORT must be between 1 and 65535'
  }).default('5000'),
  
  // Database
  MONGO_URI: z.string().min(1, 'MongoDB URI is required'),
  MONGO_DB_NAME: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).refine(n => n >= 10 && n <= 15, {
    message: 'BCRYPT_ROUNDS must be between 10 and 15'
  }).default('12'),
  
  // CORS
  FRONTEND_URL: z.string().url().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  AUTH_RATE_LIMIT_MAX: z.string().transform(Number).default('10'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),
  
  // Redis (optional)
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  
  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('5242880'), // 5MB
  ALLOWED_FILE_TYPES: z.string().transform(str => str.split(',')).default('jpg,jpeg,png,pdf,doc,docx'),
  
  // API
  API_VERSION: z.string().default('v1'),
  API_PREFIX: z.string().default('/api'),
  
  // Session (if using sessions)
  SESSION_SECRET: z.string().optional(),
  
  // External Services
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
}).refine((data) => {
  // Conditional validation: if FRONTEND_URL is provided, it must be a valid URL
  if (data.FRONTEND_URL) {
    try {
      new URL(data.FRONTEND_URL);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: 'FRONTEND_URL must be a valid URL when provided'
}).refine((data) => {
  // Conditional validation: if using Redis, require URL
  return !data.REDIS_URL || data.REDIS_URL.length > 0;
}, {
  message: 'REDIS_URL is required when Redis is enabled'
});

module.exports = { envSchema };
