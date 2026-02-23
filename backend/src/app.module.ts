import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import appConfig from './config/app.config';
import { WeatherModule } from './modules/weather/weather.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { AppController } from './app.controller';
import { ExcelModule } from './excel/excel.module';
import { AgroAnalyticsModule } from './modules/agro-analytics/agro-analytics.module';

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
    // Feature Modules
    FirebaseModule,
    WeatherModule,
    ExcelModule,
    AgroAnalyticsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
