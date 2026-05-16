import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateAffiliateDto {
  @ApiProperty({ description: 'Product UUID to generate affiliate data for' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Platform for the affiliate link (e.g. SHOPEE, TIKTOK, MANUAL)',
    example: 'SHOPEE',
    required: false,
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiProperty({
    description: 'Commission rate percentage (0–100)',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}
