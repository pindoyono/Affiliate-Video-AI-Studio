import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitForReviewDto {
  @ApiProperty({ description: 'UUID of the video to submit for review' })
  @IsUUID()
  videoId: string;

  @ApiProperty({ description: 'Optional submission notes', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ApproveVideoDto {
  @ApiProperty({ description: 'UUID of the video to approve' })
  @IsUUID()
  videoId: string;

  @ApiProperty({ description: 'Optional approval notes', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RejectVideoDto {
  @ApiProperty({ description: 'UUID of the video to reject' })
  @IsUUID()
  videoId: string;

  @ApiProperty({ description: 'Reason for rejection (required)' })
  @IsString()
  @MaxLength(1000)
  notes: string;
}
