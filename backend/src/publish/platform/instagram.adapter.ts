import { Injectable, Logger } from '@nestjs/common';
import { PlatformAdapter, PublishResult } from './platform.adapter';

@Injectable()
export class InstagramAdapter implements PlatformAdapter {
  private readonly logger = new Logger(InstagramAdapter.name);

  async publish(videoId: string, outputUrl: string, title: string): Promise<PublishResult> {
    this.logger.log(`[Instagram] Publishing video ${videoId}: "${title}" from ${outputUrl}`);
    // TODO: integrate Instagram Graph API (Reels publishing)
    const platformVideoId = `ig_${Date.now()}_${videoId.slice(0, 8)}`;
    return { platformVideoId, publishedAt: new Date() };
  }
}
