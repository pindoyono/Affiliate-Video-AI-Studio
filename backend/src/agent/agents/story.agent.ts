import { Injectable, Logger } from '@nestjs/common';
import type { AgentHandler } from './agent-handler.interface';

@Injectable()
export class StoryAgent implements AgentHandler {
  private readonly logger = new Logger(StoryAgent.name);

  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    this.logger.log(`StoryAgent executing for productId: ${input.productId ?? ''}`);
    // Integration point: AiContentService.generateStoryboard
    return {
      agent: 'STORY',
      productId: input.productId ?? '',
      storyboard: [],
      generatedAt: new Date().toISOString(),
    };
  }
}
