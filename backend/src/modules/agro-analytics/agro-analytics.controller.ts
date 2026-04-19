import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AgroAnalyticsService, AgroReportParams } from './agro-analytics.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgroReportDto } from './dto/agro-report.dto';
import { ChatReportDto } from './dto/chat-report.dto';
import { Throttle } from '@nestjs/throttler';
import { AgroApiKeyGuard } from './security/agro-api-key.guard';
import { GeminiUsageGuard } from './security/gemini-usage.guard';
import { GeminiConcurrencyInterceptor } from './security/gemini-concurrency.interceptor';
import { GeminiEndpoint } from './security/gemini-endpoint.decorator';

@ApiTags('Agro-Analytics')
@Controller('agro-analytics')
@UseGuards(AgroApiKeyGuard, GeminiUsageGuard)
@UseInterceptors(GeminiConcurrencyInterceptor)
export class AgroAnalyticsController {
  private readonly logger = new Logger(AgroAnalyticsController.name);

  constructor(private readonly analyticsService: AgroAnalyticsService) {}

  @Get('report')
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @GeminiEndpoint('report')
  @ApiOperation({ summary: 'Generar reporte de agricultura de precisión con IA' })
  async getReport(
    @Query() queryDto: AgroReportDto
  ) {
    const params: AgroReportParams = {
        startDate: queryDto.startDate,
        endDate: queryDto.endDate,
        cropBaseTemp: queryDto.cropBaseTemp ? Number(queryDto.cropBaseTemp) : 10,
        cropMaxTemp: queryDto.cropMaxTemp ? Number(queryDto.cropMaxTemp) : 30,
        cropName: queryDto.cropName
    };

    try {
      const report = await this.analyticsService.generateReport(params);
      return {
          success: true,
          data: report
      };
    } catch (error) {
      this.logger.error(
        `Error generando reporte agro: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException({
          success: false,
          message: 'No fue posible generar el reporte en este momento.'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('chat')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @GeminiEndpoint('chat')
  @ApiOperation({ summary: 'Chat con la IA sobre el reporte generado' })
  async chatWithReport(
    @Body() bodyDto: ChatReportDto,
  ) {
    const answer = await this.analyticsService.chatWithAI(
      bodyDto.question, 
      bodyDto.reportContext, 
      bodyDto.chatHistory ?? []
    );
    return {
        answer
    };
  }
}
