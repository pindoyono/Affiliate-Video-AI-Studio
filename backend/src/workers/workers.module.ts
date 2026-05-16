import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { VideoRenderWorker, ProductImportWorker, TrendAnalysisWorker } from './workers.processor';
import { AiContentModule } from '../ai-content/ai-content.module';
import { RenderModule } from '../render/render.module';
import { VideosModule } from '../videos/videos.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'video-render' },
      { name: 'product-import' },
      { name: 'trend-analysis' },
    ),
    AiContentModule,
    RenderModule,
    VideosModule,
  ],
  providers: [VideoRenderWorker, ProductImportWorker, TrendAnalysisWorker],
})
export class WorkersModule {}
