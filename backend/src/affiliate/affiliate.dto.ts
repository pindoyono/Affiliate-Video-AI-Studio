import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AffiliatePlatform } from '@prisma/client';

export class GenerateAffiliateDto {
  @ApiProperty({ description: 'Product UUID to generate affiliate data for' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Platform for the affiliate link',
    enum: AffiliatePlatform,
    example: AffiliatePlatform.SHOPEE,
    required: false,
  })
  @IsOptional()
  @IsEnum(AffiliatePlatform)
  platform?: AffiliatePlatform;

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
