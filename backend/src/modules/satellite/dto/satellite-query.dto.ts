import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class SatelliteQueryDto {
  @ApiProperty({
    example: '-84.15,10.00,-84.10,10.05',
    description: 'Bounding box: minLon,minLat,maxLon,maxLat',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/)
  bbox!: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  to!: string;
}
