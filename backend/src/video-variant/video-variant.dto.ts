import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateVariantsDto {
  @ApiProperty({ description: 'UUID of the video to generate variants for' })
  @IsUUID()
  videoId: string;

  @ApiProperty({
    description: 'Number of variants to generate (1-5)',
    required: false,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  count?: number;
}

export class SelectVariantDto {
  @ApiProperty({ description: 'UUID of the VideoVariant to mark as selected' })
  @IsUUID()
  variantId: string;
}
