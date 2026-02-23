import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global prefix
  app.setGlobalPrefix('api');

  // Validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // CORS Configuration
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? '*' : ['http://localhost:5173', 'http://127.0.0.1:5173'], // En producción permite todo, o pon aquí tu URL de Vercel
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
  });

  const port = process.env.PORT ?? 5000;

  // Log middleware para todas las solicitudes
  app.use((req, res, next) => {
    console.log(`\n📨 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    next();
  });
  
  await app.listen(port, () => {
    console.log(`
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
