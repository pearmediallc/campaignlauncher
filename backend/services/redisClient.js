const Redis = require('ioredis');

// Only initialize Redis if credentials are provided
let redis = null;

if (process.env.REDIS_HOST && process.env.REDIS_HOST !== '' && process.env.REDIS_HOST !== '127.0.0.1') {
  redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redis.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redis.on('connect', () => {
    console.log('Redis Client Connected');
  });
} else {
  console.log('Redis not configured - skipping Redis initialization');
}

module.exports = redis;