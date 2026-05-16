import { Injectable, Logger } from '@nestjs/common';
import { PlatformAdapter, PublishResult } from './platform.adapter';

@Injectable()
export class TikTokAdapter implements PlatformAdapter {
  private readonly logger = new Logger(TikTokAdapter.name);

  async publish(videoId: string, outputUrl: string, title: string): Promise<PublishResult> {
    this.logger.log(`[TikTok] Publishing video ${videoId}: "${title}" from ${outputUrl}`);
    // TODO: integrate TikTok Content Posting API
    const platformVideoId = `tt_${Date.now()}_${videoId.slice(0, 8)}`;
    return { platformVideoId, publishedAt: new Date() };
  }
}
