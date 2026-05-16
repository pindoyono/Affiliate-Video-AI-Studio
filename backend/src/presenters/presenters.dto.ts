import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePresenterDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  appearance?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sampleImageUrl?: string;
}

export class UpdatePresenterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  appearance?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sampleImageUrl?: string;
}
