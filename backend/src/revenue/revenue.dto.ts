import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRevenueReportDto {
  @ApiProperty({ description: 'Video UUID this report belongs to' })
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'Total cost incurred (USD)' })
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiProperty({ description: 'Total revenue generated (USD)' })
  @IsNumber()
  @Min(0)
  revenue: number;
}
