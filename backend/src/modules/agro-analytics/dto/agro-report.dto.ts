import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AgroReportDto {
  @ApiProperty({ example: '2025-01-01', description: 'Fecha de inicio (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ example: '2025-01-31', description: 'Fecha de fin (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiPropertyOptional({ example: 10, description: 'Temperatura base del cultivo (default: 10)' })
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(50)
  @Type(() => Number)
  cropBaseTemp?: number;

  @ApiPropertyOptional({ example: 30, description: 'Temperatura máxima óptima (default: 30)' })
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(60)
  @Type(() => Number)
  cropMaxTemp?: number;

  @ApiPropertyOptional({ example: 'Maíz', description: 'Nombre del cultivo de referencia' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  cropName?: string;
}
