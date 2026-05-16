export interface PublishResult {
  platformVideoId: string;
  publishedAt: Date;
}

export interface PlatformAdapter {
  publish(videoId: string, outputUrl: string, title: string): Promise<PublishResult>;
}
