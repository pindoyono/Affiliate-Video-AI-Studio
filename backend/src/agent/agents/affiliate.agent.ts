import { Injectable, Logger } from '@nestjs/common';
import type { AgentHandler } from './agent-handler.interface';

@Injectable()
export class AffiliateAgent implements AgentHandler {
  private readonly logger = new Logger(AffiliateAgent.name);

  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    this.logger.log(`AffiliateAgent executing for productId: ${input.productId ?? ''}`);
    // Integration point: AffiliateService link generation / commission lookup
    return {
      agent: 'AFFILIATE',
      productId: input.productId ?? '',
      affiliateUrl: null,
      commissionRate: 0,
      platform: input.platform ?? 'MANUAL',
      processedAt: new Date().toISOString(),
    };
  }
}
