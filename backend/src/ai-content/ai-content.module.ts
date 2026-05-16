import { Module } from '@nestjs/common';
import { AiContentController } from './ai-content.controller';
import { AiContentService } from './ai-content.service';
import { OllamaService } from './ollama.service';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [MemoryModule],
  controllers: [AiContentController],
  providers: [AiContentService, OllamaService],
  exports: [AiContentService, OllamaService],
})
export class AiContentModule {}
