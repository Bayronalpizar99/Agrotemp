import { Controller, Get, Query, HttpException, HttpStatus, Post, Body, BadRequestException } from '@nestjs/common';
import { AgroAnalyticsService, AgroReportParams } from './agro-analytics.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('Agro-Analytics')
@Controller('agro-analytics')
export class AgroAnalyticsController {
  constructor(private readonly analyticsService: AgroAnalyticsService) {}

  @Get('report')
  @ApiOperation({ summary: 'Generar reporte de agricultura de precisión con IA' })
  @ApiQuery({ name: 'startDate', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2025-01-31' })
  @ApiQuery({ name: 'cropBaseTemp', required: false, example: 10, description: 'Temperatura base del cultivo (default: 10)' })
  @ApiQuery({ name: 'cropMaxTemp', required: false, example: 30, description: 'Temperatura máxima óptima (default: 30)' })
  async getReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('cropBaseTemp') cropBaseTemp?: number,
    @Query('cropMaxTemp') cropMaxTemp?: number
  ) {
    if (!startDate || !endDate) {
      throw new HttpException('startDate y endDate son requeridos', HttpStatus.BAD_REQUEST);
    }

    const params: AgroReportParams = {
        startDate,
        endDate,
        cropBaseTemp: cropBaseTemp ? Number(cropBaseTemp) : 10,
        cropMaxTemp: cropMaxTemp ? Number(cropMaxTemp) : 30
    };

    try {
      const report = await this.analyticsService.generateReport(params);
      return {
          success: true,
          data: report
      };
    } catch (error) {
      throw new HttpException({
          success: false,
          message: error.message || 'Error al generar el reporte'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat con la IA sobre el reporte generado' })
  @ApiBody({ schema: { example: { question: '¿Debo regar mañana?', reportContext: {} } } })
  async chatWithReport(
    @Body() body: { reportContext: any; question: string },
  ) {
    if (!body.reportContext || !body.question) {
        throw new BadRequestException('Falta el contexto del reporte o la pregunta.');
    }
    const answer = await this.analyticsService.chatWithAI(body.question, body.reportContext);
    return {
        answer
    };
  }
}
