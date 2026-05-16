import { IsUUID, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PublishPlatformDto {
  YOUTUBE = 'YOUTUBE',
  TIKTOK = 'TIKTOK',
  INSTAGRAM = 'INSTAGRAM',
}

export class SchedulePublishDto {
  @ApiProperty({ description: 'UUID of the video to publish (must be APPROVED or PUBLISHED)' })
  @IsUUID()
  videoId: string;

  @ApiProperty({ enum: PublishPlatformDto, description: 'Target social platform' })
  @IsEnum(PublishPlatformDto)
  platform: PublishPlatformDto;

  @ApiProperty({ description: 'ISO-8601 datetime when the video should be published' })
  @IsDateString()
  scheduledAt: string;
}
