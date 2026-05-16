import { IsString, IsUrl, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportProductDto {
  @ApiProperty({ example: 'https://shopee.co.id/product/123' })
  @IsString()
  url: string;

  @ApiProperty({ enum: ['SHOPEE', 'TIKTOK', 'MANUAL'], required: false })
  @IsOptional()
  @IsEnum(['SHOPEE', 'TIKTOK', 'MANUAL'])
  sourceType?: 'SHOPEE' | 'TIKTOK' | 'MANUAL';
}
