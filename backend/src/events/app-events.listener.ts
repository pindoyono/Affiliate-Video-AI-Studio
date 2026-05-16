import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  VIDEO_CREATED,
  VIDEO_PUBLISHED,
  ANALYTICS_UPDATED,
  REVENUE_UPDATED,
  AFFILIATE_UPDATED,
  VideoCreatedEvent,
  VideoPublishedEvent,
  AnalyticsUpdatedEvent,
  RevenueUpdatedEvent,
  AffiliateUpdatedEvent,
} from './app.events';
import { AnalyticsService } from '../analytics/analytics.service';
import { AgentOrchestratorService } from '../agent/agent-orchestrator.service';
import { AgentTypeDto, DispatchAgentTaskDto } from '../agent/agent-task.dto';

@Injectable()
export class AppEventsListener {
  private readonly logger = new Logger(AppEventsListener.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly agentOrchestrator: AgentOrchestratorService,
  ) {}

  // ─── VideoCreatedEvent ────────────────────────────────────────────────────

  @OnEvent(VIDEO_CREATED)
  handleVideoCreated(event: VideoCreatedEvent): void {
    this.logger.log(
      `[video.created] videoId=${event.videoId} userId=${event.userId} title="${event.title}"`,
    );
  }

  // ─── VideoPublishedEvent ──────────────────────────────────────────────────
  //
  // Chain:  VideoPublished → track analytics baseline → run OPTIMIZATION agent
  //

  @OnEvent(VIDEO_PUBLISHED)
  async handleVideoPublished(event: VideoPublishedEvent): Promise<void> {
    this.logger.log(
      `[video.published] videoId=${event.videoId} platform=${event.platform} publishJobId=${event.publishJobId}`,
    );

    // 1. Record a publish-baseline analytics snapshot (views=0, clicks=0)
    try {
      await this.analyticsService.trackEvent(
        { videoId: event.videoId, views: 0, clicks: 0, revenue: 0, cost: 0 },
        event.userId,
      );
      this.logger.log(`[video.published] analytics baseline recorded for videoId=${event.videoId}`);
    } catch (err) {
      this.logger.warn(
        `[video.published] analytics baseline failed for videoId=${event.videoId}: ${err.message}`,
      );
    }

    // 2. Dispatch OPTIMIZATION agent
    try {
      const dto = new DispatchAgentTaskDto();
      dto.agentType = AgentTypeDto.OPTIMIZATION;
      dto.input = {
        videoId: event.videoId,
        userId: event.userId,
        platform: event.platform,
        trigger: 'video.published',
      };
      await this.agentOrchestrator.dispatch(dto, event.userId);
      this.logger.log(
        `[video.published] OPTIMIZATION agent dispatched for videoId=${event.videoId}`,
      );
    } catch (err) {
      this.logger.warn(
        `[video.published] OPTIMIZATION agent dispatch failed for videoId=${event.videoId}: ${err.message}`,
      );
    }
  }

  // ─── AnalyticsUpdatedEvent ────────────────────────────────────────────────

  @OnEvent(ANALYTICS_UPDATED)
  handleAnalyticsUpdated(event: AnalyticsUpdatedEvent): void {
    this.logger.log(
      `[analytics.updated] videoId=${event.videoId} views=${event.views} clicks=${event.clicks} revenue=${event.revenue}`,
    );
  }

  // ─── RevenueUpdatedEvent ──────────────────────────────────────────────────

  @OnEvent(REVENUE_UPDATED)
  handleRevenueUpdated(event: RevenueUpdatedEvent): void {
    this.logger.log(
      `[revenue.updated] videoId=${event.videoId} profit=${event.profit} roi=${event.roi}`,
    );
  }

  // ─── AffiliateUpdatedEvent ────────────────────────────────────────────────

  @OnEvent(AFFILIATE_UPDATED)
  handleAffiliateUpdated(event: AffiliateUpdatedEvent): void {
    this.logger.log(
      `[affiliate.updated] productId=${event.productId} platform=${event.platform} commission=${event.estimatedCommission}`,
    );
  }
}
