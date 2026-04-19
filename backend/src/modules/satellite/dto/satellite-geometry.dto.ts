import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';

export class SatelliteGeometryDto {
  @ApiPropertyOptional({
    description: 'Polígono opcional como pares [lng, lat], mínimo 3 puntos',
    type: Array,
  })
  @IsOptional()
  @IsArray()
  geometry?: unknown[];
}
