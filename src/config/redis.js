const redis = require('redis');
const logger = require('./logger');
const config = require('./env');

let redisClient = null;

/**
 * Initialize Redis connection
 */
const connectRedis = async () => {
  try {
    if (!config.redis.url) {
      logger.info('Redis not configured - skipping Redis connection');
      return null;
    }

    redisClient = redis.createClient({
      url: config.redis.url,
      password: config.redis.password,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis server connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          logger.error('Redis max retry attempts reached');
          return undefined;
        }
        // Retry after 3 seconds
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    redisClient.on('end', () => {
      logger.warn('Redis client disconnected');
    });

    await redisClient.connect();
    
    logger.info('Redis connected successfully');
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: error.message });
    return null;
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Cache middleware factory
 * @param {string} keyPrefix - Cache key prefix
 * @param {number} ttl - Time to live in seconds
 */
const cacheMiddleware = (keyPrefix, ttl = 300) => {
  return async (req, res, next) => {
    if (!redisClient) {
      return next(); // Skip caching if Redis is not available
    }

    try {
      const cacheKey = `${keyPrefix}:${req.originalUrl}:${JSON.stringify(req.query)}`;
      
      // Try to get cached data
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        logger.debug('Cache hit', { cacheKey });
        return res.json(JSON.parse(cachedData));
      }
      
      // Override res.json to cache response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response
        redisClient.setEx(cacheKey, ttl, JSON.stringify(data))
          .catch(err => logger.error('Failed to cache response', { error: err.message, cacheKey }));
        
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next(); // Continue without caching on error
    }
  };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Cache key pattern
 */
const invalidateCache = async (pattern) => {
  if (!redisClient) return;
  
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info('Cache invalidated', { pattern, keysCount: keys.length });
    }
  } catch (error) {
    logger.error('Failed to invalidate cache', { error: error.message, pattern });
  }
};

/**
 * Set cache value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
const setCache = async (key, value, ttl = 300) => {
  if (!redisClient) return;
  
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    logger.debug('Cache set', { key, ttl });
  } catch (error) {
    logger.error('Failed to set cache', { error: error.message, key });
  }
};

/**
 * Get cache value
 * @param {string} key - Cache key
 */
const getCache = async (key) => {
  if (!redisClient) return null;
  
  try {
    const value = await redisClient.get(key);
    if (value) {
      logger.debug('Cache hit', { key });
      return JSON.parse(value);
    }
    logger.debug('Cache miss', { key });
    return null;
  } catch (error) {
    logger.error('Failed to get cache', { error: error.message, key });
    return null;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  cacheMiddleware,
  invalidateCache,
  setCache,
  getCache
};
