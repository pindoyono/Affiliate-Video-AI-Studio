import { Injectable, Logger } from '@nestjs/common';
import type { AgentHandler } from './agent-handler.interface';

@Injectable()
export class VoiceAgent implements AgentHandler {
  private readonly logger = new Logger(VoiceAgent.name);

  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    this.logger.log(`VoiceAgent executing for script length: ${(input.script ?? '').length}`);
    // Integration point: TTS service (ElevenLabs / Polly)
    return {
      agent: 'VOICE',
      audioUrl: null,
      durationSeconds: 0,
      generatedAt: new Date().toISOString(),
    };
  }
}
