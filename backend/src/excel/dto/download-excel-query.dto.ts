import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class DownloadExcelQueryDto {
  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-04-10' })
  @IsDateString()
  endDate!: string;
}
