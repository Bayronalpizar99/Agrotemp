import { Controller, Get, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
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

  @Get('true-color-image')
  @ApiOperation({ summary: 'Imagen PNG en color verdadero (RGB) de Sentinel-2' })
  @ApiQuery({ name: 'bbox', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async getTrueColorImage(
    @Query('bbox') bboxStr: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    if (!bboxStr || !from || !to) {
      throw new HttpException('bbox, from y to son requeridos', HttpStatus.BAD_REQUEST);
    }
    const bbox = bboxStr.split(',').map(Number);
    if (bbox.length !== 4 || bbox.some(isNaN)) {
      throw new HttpException('bbox debe tener 4 valores numéricos', HttpStatus.BAD_REQUEST);
    }
    try {
      const imageBuffer = await this.satelliteService.getTrueColorImage(bbox, from, to);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(imageBuffer);
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message || 'Error al generar imagen' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('ndvi-image')
  @ApiOperation({ summary: 'Imagen PNG de NDVI coloreado para un área y periodo' })
  @ApiQuery({ name: 'bbox', required: true, example: '-84.52,10.35,-84.50,10.37' })
  @ApiQuery({ name: 'from', required: true, example: '2026-02-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-03-28' })
  async getNDVIImage(
    @Query('bbox') bboxStr: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    if (!bboxStr || !from || !to) {
      throw new HttpException('bbox, from y to son requeridos', HttpStatus.BAD_REQUEST);
    }
    const bbox = bboxStr.split(',').map(Number);
    if (bbox.length !== 4 || bbox.some(isNaN)) {
      throw new HttpException('bbox debe tener 4 valores numéricos', HttpStatus.BAD_REQUEST);
    }

    try {
      const imageBuffer = await this.satelliteService.getNDVIImage(bbox, from, to);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(imageBuffer);
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message || 'Error al generar imagen NDVI' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
