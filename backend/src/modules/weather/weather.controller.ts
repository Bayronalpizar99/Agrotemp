import { Controller, Get, Query, ParseIntPipe, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { WeatherService } from './weather.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentWeatherData } from './interfaces/current-weather.interface';
import { HourlyWeatherData } from './interfaces/hourly-weather.interface';

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

    @Get('debug/dates')
    @ApiOperation({ summary: 'Depurar fechas existentes en Firestore' })
    async getDebugDates() {
        return this.weatherService.getDebugDates();
    }

    @Get('hourly')
    @ApiOperation({ summary: 'Get latest hourly weather data' })
    async getHourlyWeather(): Promise<HourlyWeatherData[]> {
        return this.weatherService.getHourlyWeather();
    }

    @Get('range')
    @ApiOperation({ summary: 'Get hourly weather data by date range' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    async getHourlyWeatherByDateRange(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ): Promise<HourlyWeatherData[]> {
        return this.weatherService.getHourlyWeatherByDateRange(startDate, endDate);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get daily weather statistics' })
    async getDailyStats(): Promise<any> {
        return this.weatherService.getDailyStats();
    }
}