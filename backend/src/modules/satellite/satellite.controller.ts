import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SatelliteService } from './satellite.service';

@ApiTags('Satellite')
@Controller('satellite')
export class SatelliteController {
  constructor(private readonly satelliteService: SatelliteService) {}

  @Get('ndvi')
  @ApiOperation({ summary: 'Obtener estadísticas NDVI de Sentinel-2 para un área y periodo' })
  @ApiQuery({ name: 'bbox', required: true, example: '-84.15,10.00,-84.10,10.05', description: 'Bounding box: minLon,minLat,maxLon,maxLat' })
  @ApiQuery({ name: 'from', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-01-31' })
  async getNDVI(
    @Query('bbox') bboxStr: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!bboxStr || !from || !to) {
      throw new HttpException('bbox, from y to son requeridos', HttpStatus.BAD_REQUEST);
    }

    const bbox = bboxStr.split(',').map(Number);
    if (bbox.length !== 4 || bbox.some(isNaN)) {
      throw new HttpException('bbox debe tener 4 valores numéricos: minLon,minLat,maxLon,maxLat', HttpStatus.BAD_REQUEST);
    }

    try {
      const data = await this.satelliteService.getNDVI(bbox, from, to);
      return { success: true, data };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message || 'Error al obtener datos NDVI' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
