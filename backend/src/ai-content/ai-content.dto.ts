import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateContentDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: ['FACELESS', 'AI_PRESENTER', 'HYBRID'] })
  @IsEnum(['FACELESS', 'AI_PRESENTER', 'HYBRID'])
  mode: 'FACELESS' | 'AI_PRESENTER' | 'HYBRID';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  presenterId?: string;
}
