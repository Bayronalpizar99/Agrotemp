import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { SatelliteService } from './satellite.service';
import { SatelliteQueryDto } from './dto/satellite-query.dto';
import { SatelliteGeometryDto } from './dto/satellite-geometry.dto';

@ApiTags('Satellite')
@Controller('satellite')
export class SatelliteController {
  private readonly logger = new Logger(SatelliteController.name);

  constructor(private readonly satelliteService: SatelliteService) {}

  @Post('ndvi')
  @ApiOperation({ summary: 'Obtener estadísticas NDVI de Sentinel-2 para un área y periodo' })
  @ApiQuery({ name: 'bbox', required: true, example: '-84.15,10.00,-84.10,10.05', description: 'Bounding box: minLon,minLat,maxLon,maxLat' })
  @ApiQuery({ name: 'from', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-01-31' })
  @ApiBody({ required: false, description: 'Polígono GeoJSON opcional para estadísticas precisas', schema: { type: 'object', properties: { geometry: { type: 'array', items: { type: 'array', items: { type: 'number' } }, description: '[[lng,lat], ...] — mínimo 3 puntos' } } } })
  async getNDVI(
    @Query() queryDto: SatelliteQueryDto,
    @Body() bodyDto?: SatelliteGeometryDto,
  ) {
    const { bbox: bboxStr, from, to } = queryDto;

    const bbox = bboxStr.split(',').map(Number);
    if (bbox.length !== 4 || bbox.some(isNaN)) {
      throw new HttpException('bbox debe tener 4 valores numéricos: minLon,minLat,maxLon,maxLat', HttpStatus.BAD_REQUEST);
    }

    let geometry: [number, number][] | undefined;
    if (bodyDto?.geometry) {
      if (!Array.isArray(bodyDto.geometry) || bodyDto.geometry.length < 3) {
        throw new HttpException('geometry debe ser un array de al menos 3 pares [lng,lat]', HttpStatus.BAD_REQUEST);
      }
      if (bodyDto.geometry.some((p) => !Array.isArray(p) || p.length !== 2 || p.some((n) => Number.isNaN(Number(n))))) {
        throw new HttpException('Cada punto de geometry debe ser un par numérico [lng, lat]', HttpStatus.BAD_REQUEST);
      }
      geometry = bodyDto.geometry as [number, number][];
    }

    try {
      const data = await this.satelliteService.getNDVI(bbox, from, to, geometry);
      return { success: true, data };
    } catch (error) {
      this.logger.error(
        `Error al consultar NDVI: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        { success: false, message: 'No fue posible obtener datos NDVI en este momento.' },
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
    @Query() queryDto: SatelliteQueryDto,
    @Res() res: Response,
  ) {
    const { bbox: bboxStr, from, to } = queryDto;
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
      this.logger.error(
        `Error al obtener imagen true-color: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        { success: false, message: 'No fue posible generar la imagen satelital.' },
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
    @Query() queryDto: SatelliteQueryDto,
    @Res() res: Response,
  ) {
    const { bbox: bboxStr, from, to } = queryDto;
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
      this.logger.error(
        `Error al obtener imagen NDVI: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        { success: false, message: 'No fue posible generar la imagen NDVI.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
