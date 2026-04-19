import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { WeatherService } from './weather.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentWeatherData } from './interfaces/current-weather.interface';
import { HourlyWeatherData } from './interfaces/hourly-weather.interface';
import { DateRangeQueryDto } from './dto/date-range-query.dto';

@ApiTags('Weather')
@Controller('weather')
@UseInterceptors(CacheInterceptor)
export class WeatherController {
    constructor(private readonly weatherService: WeatherService) {}

    @Get('current')
    @ApiOperation({ summary: 'Get current weather data' })
    async getCurrentWeather(): Promise<CurrentWeatherData> {
        return this.weatherService.getCurrentWeather();
    }

    @Get('hourly')
    @ApiOperation({ summary: 'Get latest hourly weather data' })
    async getHourlyWeather(): Promise<HourlyWeatherData[]> {
        return this.weatherService.getHourlyWeather();
    }

    @Get('range')
    @ApiOperation({ summary: 'Get hourly weather data by date range' })
    async getHourlyWeatherByDateRange(
        @Query() queryDto: DateRangeQueryDto,
    ): Promise<HourlyWeatherData[]> {
        const { startDate, endDate } = queryDto;
        return this.weatherService.getHourlyWeatherByDateRange(startDate, endDate);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get daily weather statistics' })
    async getDailyStats(): Promise<any> {
        return this.weatherService.getDailyStats();
    }

    @Get('radiation')
    @ApiOperation({ summary: 'Get current solar radiation from Open-Meteo forecast (station sensor broken)' })
    async getCurrentRadiation(): Promise<number | null> {
        return this.weatherService.getCurrentRadiation();
    }
}
