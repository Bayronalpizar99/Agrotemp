import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Sugerencia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  category!: string;

  @ApiProperty({ example: 'Excelente plataforma.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment!: string;
}
