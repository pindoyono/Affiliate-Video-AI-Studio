import { Module } from '@nestjs/common';
import { AiContentController } from './ai-content.controller';
import { AiContentService } from './ai-content.service';
import { OllamaService } from './ollama.service';

@Module({
  controllers: [AiContentController],
  providers: [AiContentService, OllamaService],
  exports: [AiContentService, OllamaService],
})
export class AiContentModule {}
