import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PublishService } from './publish.service';

@Injectable()
export class PublishScheduler {
  private readonly logger = new Logger(PublishScheduler.name);

  constructor(private readonly publishService: PublishService) {}

  /**
   * Every minute: pick up any PENDING publish jobs whose scheduledAt has passed
   * and enqueue them in the Bull queue.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledJobs() {
    this.logger.debug('Checking for due publish jobs…');
    await this.publishService.enqueueDueJobs();
  }
}
