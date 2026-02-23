import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '60', 10), // seconds
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Frontend URL
  },
}));