import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';

const parseCorsOrigins = (rawOrigins?: string): string[] =>
  (rawOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const isProduction = process.env.NODE_ENV === 'production';

  // Global prefix
  app.setGlobalPrefix('api');

  // Security Headers
  app.use(helmet());

  // Payload Limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // CORS Configuration
  const configuredOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
  const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const allowedOrigins =
    configuredOrigins.length > 0 ? configuredOrigins : defaultDevOrigins;

  if (isProduction && configuredOrigins.length === 0) {
    throw new Error(
      'CORS_ORIGIN debe configurarse en producción (lista separada por comas).',
    );
  }

  if (isProduction && allowedOrigins.includes('*')) {
    throw new Error(
      'CORS_ORIGIN no puede ser "*" en producción cuando credentials=true.',
    );
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requests sin origin (curl/health checks/server-to-server).
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origen no permitido por CORS: ${origin}`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-agro-api-key', 'X-Agro-Api-Key'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
  });

  const port = process.env.PORT ?? 5000;

  // Log middleware sin exponer headers ni query params sensibles.
  app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
      logger.log(
        `${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - startTime}ms)`,
      );
    });
    next();
  });
  
  await app.listen(port, () => {
    logger.log(`
==========================================================
🚀 Servidor iniciado en http://localhost:${port}
📁 Rutas disponibles:
   - GET /api/excel/download
   - GET /api/weather/current
   - GET /api/weather/hourly
   - GET /api/weather/stats
==========================================================
    `);
  });
}
bootstrap();
