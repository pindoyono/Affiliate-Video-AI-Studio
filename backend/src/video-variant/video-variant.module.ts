import { Module } from '@nestjs/common';
import { VideoVariantController } from './video-variant.controller';
import { VideoVariantService } from './video-variant.service';
import { AiContentModule } from '../ai-content/ai-content.module';

@Module({
  imports: [AiContentModule],
  controllers: [VideoVariantController],
  providers: [VideoVariantService],
  exports: [VideoVariantService],
})
export class VideoVariantModule {}
