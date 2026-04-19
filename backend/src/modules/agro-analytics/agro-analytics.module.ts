import { Module } from '@nestjs/common';
import { AgroAnalyticsController } from './agro-analytics.controller';
import { AgroAnalyticsService } from './agro-analytics.service';
import { WeatherModule } from '../weather/weather.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { AgroApiKeyGuard } from './security/agro-api-key.guard';
import { GeminiUsageGuard } from './security/gemini-usage.guard';
import { GeminiUsageService } from './security/gemini-usage.service';
import { GeminiConcurrencyInterceptor } from './security/gemini-concurrency.interceptor';

@Module({
  imports: [WeatherModule, FirebaseModule],
  controllers: [AgroAnalyticsController],
  providers: [
    AgroAnalyticsService,
    AgroApiKeyGuard,
    GeminiUsageGuard,
    GeminiUsageService,
    GeminiConcurrencyInterceptor,
  ],
  exports: [AgroAnalyticsService]
})
export class AgroAnalyticsModule {}
