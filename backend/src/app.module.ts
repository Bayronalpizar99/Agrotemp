import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import appConfig from './config/app.config';
import { WeatherModule } from './modules/weather/weather.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { AppController } from './app.controller';
import { ExcelModule } from './excel/excel.module';
import { AgroAnalyticsModule } from './modules/agro-analytics/agro-analytics.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { SatelliteModule } from './modules/satellite/satellite.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    // Cache
    CacheModule.register({
      isGlobal: true,
      ttl: 60, // Default TTL in seconds
    }),
    // Rate Limiting (DDoS Protection)
    ThrottlerModule.forRoot([{
      ttl: 60000, 
      limit: 20, // 20 requests per minute
    }]),
    // Feature Modules
    FirebaseModule,
    WeatherModule,
    ExcelModule,
    AgroAnalyticsModule,
    FeedbackModule,
    SatelliteModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
