import { Module } from '@nestjs/common';
import { AgroAnalyticsController } from './agro-analytics.controller';
import { AgroAnalyticsService } from './agro-analytics.service';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [WeatherModule],
  controllers: [AgroAnalyticsController],
  providers: [AgroAnalyticsService],
  exports: [AgroAnalyticsService]
})
export class AgroAnalyticsModule {}
