import { Injectable, Logger } from '@nestjs/common';
import type { AgentHandler } from './agent-handler.interface';

@Injectable()
export class ScriptAgent implements AgentHandler {
  private readonly logger = new Logger(ScriptAgent.name);

  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    this.logger.log(`ScriptAgent executing for productId: ${input.productId ?? ''}`);
    // Integration point: AiContentService.generateScript
    return {
      agent: 'SCRIPT',
      productId: input.productId ?? '',
      script: '',
      hook: '',
      cta: '',
      generatedAt: new Date().toISOString(),
    };
  }
}
