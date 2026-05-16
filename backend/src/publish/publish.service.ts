import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulePublishDto } from './publish.dto';
import { YouTubeAdapter } from './platform/youtube.adapter';
import { TikTokAdapter } from './platform/tiktok.adapter';
import { InstagramAdapter } from './platform/instagram.adapter';
import type { PlatformAdapter } from './platform/platform.adapter';

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('publish-jobs') private readonly publishQueue: Queue,
    private readonly youtube: YouTubeAdapter,
    private readonly tiktok: TikTokAdapter,
    private readonly instagram: InstagramAdapter,
  ) {}

  /**
   * Schedule a publish job for an APPROVED video.
   */
  async schedule(dto: SchedulePublishDto, userId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id: dto.videoId, userId },
    });
    if (!video) throw new NotFoundException('Video not found');

    if (!['APPROVED', 'SCHEDULED'].includes(video.status)) {
      throw new BadRequestException(
        `Video must be APPROVED before scheduling (current: ${video.status})`,
      );
    }

    const scheduledAt = new Date(dto.scheduledAt);

    const job = await this.prisma.publishJob.create({
      data: {
        videoId: dto.videoId,
        platform: dto.platform as any,
        scheduledAt,
        status: 'PENDING',
      },
    });

    // Update video status to SCHEDULED
    await this.prisma.video.update({
      where: { id: dto.videoId },
      data: { status: 'SCHEDULED' },
    });

    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    await this.publishQueue.add(
      'publish',
      { publishJobId: job.id },
      { delay, attempts: job.maxAttempts, backoff: { type: 'exponential', delay: 10_000 } },
    );

    this.logger.log(
      `Publish job ${job.id} scheduled for ${dto.platform} at ${scheduledAt.toISOString()}`,
    );

    return job;
  }

  /**
   * List all publish jobs for the current user's videos.
   */
  async getJobs(userId: string) {
    const jobs = await this.prisma.publishJob.findMany({
      where: { video: { userId } },
      include: { video: { select: { title: true, outputUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { total: jobs.length, jobs };
  }

  /**
   * Get a single publish job (ownership-checked).
   */
  async getJob(jobId: string, userId: string) {
    const job = await this.prisma.publishJob.findFirst({
      where: { id: jobId, video: { userId } },
      include: { video: { select: { title: true, outputUrl: true } } },
    });
    if (!job) throw new NotFoundException('Publish job not found');
    return job;
  }

  /**
   * Execute the actual platform publish for a given PublishJob.
   * Called by the Bull worker.
   */
  async processPublish(publishJobId: string): Promise<void> {
    const job = await this.prisma.publishJob.findUnique({
      where: { id: publishJobId },
      include: { video: true },
    });

    if (!job) throw new Error(`PublishJob ${publishJobId} not found`);

    if (job.status === 'PUBLISHED') {
      this.logger.warn(`PublishJob ${publishJobId} already published – skipping`);
      return;
    }

    // Mark as processing
    await this.prisma.publishJob.update({
      where: { id: publishJobId },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });

    try {
      if (!job.video.outputUrl) {
        throw new Error('Video has no outputUrl – render must complete before publishing');
      }

      const adapter = this.getAdapter(job.platform as string);
      const result = await adapter.publish(job.videoId, job.video.outputUrl, job.video.title);

      await this.prisma.$transaction([
        this.prisma.publishJob.update({
          where: { id: publishJobId },
          data: {
            status: 'PUBLISHED',
            publishedAt: result.publishedAt,
            platformVideoId: result.platformVideoId,
            error: null,
          },
        }),
        this.prisma.video.update({
          where: { id: job.videoId },
          data: { status: 'PUBLISHED' },
        }),
      ]);

      this.logger.log(`PublishJob ${publishJobId} published to ${job.platform}`);
    } catch (err) {
      const currentJob = await this.prisma.publishJob.findUnique({
        where: { id: publishJobId },
      });
      const isFinal = currentJob ? currentJob.attempts >= currentJob.maxAttempts : true;

      await this.prisma.publishJob.update({
        where: { id: publishJobId },
        data: {
          status: isFinal ? 'FAILED' : 'PENDING',
          error: err.message,
        },
      });

      this.logger.error(`PublishJob ${publishJobId} failed: ${err.message}`);
      throw err; // re-throw so Bull handles retry
    }
  }

  /**
   * Enqueue all PENDING publish jobs whose scheduledAt has passed.
   * Called by the cron scheduler.
   */
  async enqueueDueJobs(): Promise<void> {
    const due = await this.prisma.publishJob.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
        attempts: { lt: this.prisma.publishJob['fields']?.maxAttempts ?? 3 },
      },
    });

    for (const job of due) {
      // Only enqueue jobs that haven't exceeded retries
      if (job.attempts < job.maxAttempts) {
        await this.publishQueue.add(
          'publish',
          { publishJobId: job.id },
          { attempts: job.maxAttempts - job.attempts, backoff: { type: 'exponential', delay: 10_000 } },
        );
        this.logger.log(`Re-queued due publish job ${job.id}`);
      }
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private getAdapter(platform: string): PlatformAdapter {
    switch (platform) {
      case 'YOUTUBE':
        return this.youtube;
      case 'TIKTOK':
        return this.tiktok;
      case 'INSTAGRAM':
        return this.instagram;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
