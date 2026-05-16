import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertMemoryDto {
  @ApiProperty({ required: false, description: 'Content niche (e.g. "beauty", "tech gadgets")' })
  @IsOptional()
  @IsString()
  niche?: string;

  @ApiProperty({ required: false, description: 'Target audience description' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiProperty({ required: false, description: 'Content style (e.g. "funny", "educational")' })
  @IsOptional()
  @IsString()
  contentStyle?: string;

  @ApiProperty({ required: false, description: 'Primary language code (default: en)' })
  @IsOptional()
  @IsString()
  language?: string;
}
