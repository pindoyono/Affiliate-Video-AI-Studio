import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { PublishWorker } from './publish.worker';
import { PublishScheduler } from './publish.scheduler';
import { YouTubeAdapter } from './platform/youtube.adapter';
import { TikTokAdapter } from './platform/tiktok.adapter';
import { InstagramAdapter } from './platform/instagram.adapter';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'publish-jobs' }),
    ScheduleModule.forRoot(),
  ],
  controllers: [PublishController],
  providers: [
    PublishService,
    PublishWorker,
    PublishScheduler,
    YouTubeAdapter,
    TikTokAdapter,
    InstagramAdapter,
  ],
  exports: [PublishService],
})
export class PublishModule {}
