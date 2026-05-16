import { IsString, IsEnum, IsOptional, IsUUID, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: ['FACELESS', 'AI_PRESENTER', 'HYBRID'], required: false })
  @IsOptional()
  @IsEnum(['FACELESS', 'AI_PRESENTER', 'HYBRID'])
  mode?: 'FACELESS' | 'AI_PRESENTER' | 'HYBRID';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  presenterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  scenes?: Array<{
    order: number;
    duration: number;
    imagePrompt?: string;
    narrationText?: string;
  }>;
}
