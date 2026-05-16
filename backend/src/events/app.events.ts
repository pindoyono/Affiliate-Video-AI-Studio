// ─── Event name constants ─────────────────────────────────────────────────────
export const VIDEO_CREATED        = 'video.created';
export const VIDEO_PUBLISHED      = 'video.published';
export const ANALYTICS_UPDATED    = 'analytics.updated';
export const REVENUE_UPDATED      = 'revenue.updated';
export const AFFILIATE_UPDATED    = 'affiliate.updated';

// ─── Event payload classes ────────────────────────────────────────────────────

export class VideoCreatedEvent {
  constructor(
    public readonly videoId: string,
    public readonly userId: string,
    public readonly title: string,
  ) {}
}

export class VideoPublishedEvent {
  constructor(
    public readonly videoId: string,
    public readonly userId: string,
    public readonly platform: string,
    public readonly publishJobId: string,
  ) {}
}

export class AnalyticsUpdatedEvent {
  constructor(
    public readonly videoId: string,
    public readonly userId: string,
    public readonly views: number,
    public readonly clicks: number,
    public readonly revenue: number,
  ) {}
}

export class RevenueUpdatedEvent {
  constructor(
    public readonly videoId: string,
    public readonly userId: string,
    public readonly cost: number,
    public readonly revenue: number,
    public readonly profit: number,
    public readonly roi: number,
  ) {}
}

export class AffiliateUpdatedEvent {
  constructor(
    public readonly productId: string,
    public readonly userId: string,
    public readonly platform: string,
    public readonly estimatedCommission: number,
  ) {}
}
