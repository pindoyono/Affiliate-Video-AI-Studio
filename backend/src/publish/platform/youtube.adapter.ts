import { Injectable, Logger } from '@nestjs/common';
import { PlatformAdapter, PublishResult } from './platform.adapter';

@Injectable()
export class YouTubeAdapter implements PlatformAdapter {
  private readonly logger = new Logger(YouTubeAdapter.name);

  async publish(videoId: string, outputUrl: string, title: string): Promise<PublishResult> {
    this.logger.log(`[YouTube] Publishing video ${videoId}: "${title}" from ${outputUrl}`);
    // TODO: integrate YouTube Data API v3 (OAuth2, videos.insert)
    const platformVideoId = `yt_${Date.now()}_${videoId.slice(0, 8)}`;
    return { platformVideoId, publishedAt: new Date() };
  }
}
