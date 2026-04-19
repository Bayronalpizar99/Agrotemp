import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatHistoryDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['user', 'assistant'])
  role!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}

export class ChatReportDto {
  @ApiProperty({ description: 'Contexto del reporte generado previamente' })
  @IsObject()
  @IsNotEmpty()
  reportContext!: Record<string, any>;

  @ApiProperty({ example: '¿Debo regar mañana?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question!: string;

  @ApiPropertyOptional({ description: 'Historial de conversacion' })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryDto)
  chatHistory?: ChatHistoryDto[];
}
