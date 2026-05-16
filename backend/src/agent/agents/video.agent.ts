import { Injectable, Logger } from '@nestjs/common';
import type { AgentHandler } from './agent-handler.interface';

@Injectable()
export class VideoAgent implements AgentHandler {
  private readonly logger = new Logger(VideoAgent.name);

  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    this.logger.log(`VideoAgent executing for videoId: ${input.videoId ?? ''}`);
    // Integration point: RenderService
    return {
      agent: 'VIDEO',
      videoId: input.videoId ?? '',
      outputUrl: null,
      thumbnailUrl: null,
      renderedAt: new Date().toISOString(),
    };
  }
}
