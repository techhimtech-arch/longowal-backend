const { z } = require('zod');
const { envSchema } = require('./envSchema');

/**
 * Validates and parses environment variables using Zod schema
 * @returns {Object} Parsed and validated environment configuration
 */
const validateEnv = () => {
  try {
    // Parse and validate environment variables
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    console.error('Error during environment validation:', error);
    
    if (error instanceof z.ZodError && error.errors) {
      console.error('Environment validation failed', {
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.received
        }))
      });
      
      // Provide helpful error message
      const errorMessages = error.errors.map(err => 
        `  - ${err.path.join('.')}: ${err.message} (received: ${err.received})`
      ).join('\n');
      
      console.error('Please fix the following environment variables:\n' + errorMessages);
      console.error('Example .env file configuration:');
      console.error({
        NODE_ENV: 'development',
        PORT: '5000',
        MONGO_URI: 'mongodb+srv://user:password@cluster.mongodb.net/dbname',
        JWT_SECRET: 'your-super-secret-jwt-key-at-least-32-chars',
        JWT_REFRESH_SECRET: 'your-super-secret-refresh-key-at-least-32-chars',
        FRONTEND_URL: 'http://localhost:3000',
        LOG_LEVEL: 'info'
      });
    } else {
      console.error('Unexpected error during environment validation', {
        error: error.message,
        stack: error.stack
      });
    }
    
    process.exit(1);
  }
};

/**
 * Get environment variable with fallback and type conversion
 * @param {string} key - Environment variable key
 * @param {any} fallback - Default value if not found
 * @returns {any} Environment value or fallback
 */
const getEnvVar = (key, fallback = null) => {
  const value = process.env[key];
  if (value === undefined) return fallback;
  
  // Try to parse as JSON first
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/**
 * Check if running in development mode
 */
const isDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Check if running in production mode
 */
const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Check if running in test mode
 */
const isTest = () => process.env.NODE_ENV === 'test';

module.exports = {
  validateEnv,
  getEnvVar,
  isDevelopment,
  isProduction,
  isTest
};
