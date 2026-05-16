import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { PublishService } from './publish.service';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeAdapter } from './platform/youtube.adapter';
import { TikTokAdapter } from './platform/tiktok.adapter';
import { InstagramAdapter } from './platform/instagram.adapter';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 60_000).toISOString();

function makeVideo(overrides: Record<string, any> = {}) {
  return {
    id: 'video-1',
    userId: 'user-1',
    title: 'Test Video',
    status: 'APPROVED',
    outputUrl: 'https://cdn.example.com/video-1.mp4',
    ...overrides,
  };
}

function makeJob(overrides: Record<string, any> = {}) {
  return {
    id: 'job-1',
    videoId: 'video-1',
    platform: 'YOUTUBE',
    scheduledAt: new Date(FUTURE),
    publishedAt: null,
    status: 'PENDING',
    attempts: 0,
    maxAttempts: 3,
    platformVideoId: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    video: makeVideo(),
    ...overrides,
  };
}

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockPrisma = {
  video: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  publishJob: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({}),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('PublishService', () => {
  let service: PublishService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('publish-jobs'), useValue: mockQueue },
        YouTubeAdapter,
        TikTokAdapter,
        InstagramAdapter,
      ],
    }).compile();

    service = module.get<PublishService>(PublishService);
    jest.resetAllMocks();
    mockQueue.add.mockResolvedValue({});
  });

  // ─── schedule ─────────────────────────────────────────────────────────────

  describe('schedule', () => {
    it('creates a PublishJob, updates video to SCHEDULED, enqueues Bull job', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(makeVideo({ status: 'APPROVED' }));
      const createdJob = makeJob();
      mockPrisma.publishJob.create.mockResolvedValue(createdJob);
      mockPrisma.video.update.mockResolvedValue(makeVideo({ status: 'SCHEDULED' }));

      const result = await service.schedule(
        { videoId: 'video-1', platform: 'YOUTUBE' as any, scheduledAt: FUTURE },
        'user-1',
      );

      expect(mockPrisma.publishJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ videoId: 'video-1', platform: 'YOUTUBE' }),
        }),
      );
      expect(mockPrisma.video.update).toHaveBeenCalledWith({
        where: { id: 'video-1' },
        data: { status: 'SCHEDULED' },
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish',
        { publishJobId: createdJob.id },
        expect.any(Object),
      );
      expect(result.status).toBe('PENDING');
    });

    it('throws NotFoundException when video does not belong to user', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(null);

      await expect(
        service.schedule({ videoId: 'x', platform: 'YOUTUBE' as any, scheduledAt: FUTURE }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when video is not APPROVED or SCHEDULED', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(makeVideo({ status: 'DRAFT' }));

      await expect(
        service.schedule({ videoId: 'video-1', platform: 'YOUTUBE' as any, scheduledAt: FUTURE }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows scheduling a SCHEDULED video (e.g. reschedule)', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(makeVideo({ status: 'SCHEDULED' }));
      mockPrisma.publishJob.create.mockResolvedValue(makeJob());
      mockPrisma.video.update.mockResolvedValue(makeVideo({ status: 'SCHEDULED' }));

      const result = await service.schedule(
        { videoId: 'video-1', platform: 'TIKTOK' as any, scheduledAt: FUTURE },
        'user-1',
      );

      expect(result).toBeDefined();
    });
  });

  // ─── getJobs ──────────────────────────────────────────────────────────────

  describe('getJobs', () => {
    it('returns all publish jobs for the user', async () => {
      const jobs = [makeJob(), makeJob({ id: 'job-2', platform: 'TIKTOK' })];
      mockPrisma.publishJob.findMany.mockResolvedValue(jobs);

      const result = await service.getJobs('user-1');

      expect(result.total).toBe(2);
      expect(result.jobs).toHaveLength(2);
      expect(mockPrisma.publishJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { video: { userId: 'user-1' } } }),
      );
    });

    it('returns empty list when no jobs exist', async () => {
      mockPrisma.publishJob.findMany.mockResolvedValue([]);
      const result = await service.getJobs('user-1');
      expect(result.total).toBe(0);
    });
  });

  // ─── getJob ───────────────────────────────────────────────────────────────

  describe('getJob', () => {
    it('returns a specific job', async () => {
      mockPrisma.publishJob.findFirst.mockResolvedValue(makeJob());
      const result = await service.getJob('job-1', 'user-1');
      expect(result.id).toBe('job-1');
    });

    it('throws NotFoundException when job does not belong to user', async () => {
      mockPrisma.publishJob.findFirst.mockResolvedValue(null);
      await expect(service.getJob('x', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── processPublish ───────────────────────────────────────────────────────

  describe('processPublish', () => {
    it('publishes to YouTube and marks job PUBLISHED', async () => {
      const job = makeJob({ status: 'PENDING', platform: 'YOUTUBE', attempts: 0 });
      mockPrisma.publishJob.findUnique.mockResolvedValueOnce(job);
      mockPrisma.publishJob.update.mockResolvedValue({ ...job, status: 'PROCESSING', attempts: 1 });
      mockPrisma.publishJob.findUnique.mockResolvedValueOnce({ ...job, attempts: 1, maxAttempts: 3 });
      mockPrisma.$transaction.mockResolvedValue([
        { ...job, status: 'PUBLISHED' },
        { ...job.video, status: 'PUBLISHED' },
      ]);

      await expect(service.processPublish('job-1')).resolves.toBeUndefined();

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('skips a job that is already PUBLISHED', async () => {
      const job = makeJob({ status: 'PUBLISHED' });
      mockPrisma.publishJob.findUnique.mockResolvedValue(job);

      await service.processPublish('job-1');

      expect(mockPrisma.publishJob.update).not.toHaveBeenCalled();
    });

    it('throws when PublishJob does not exist', async () => {
      mockPrisma.publishJob.findUnique.mockResolvedValue(null);
      await expect(service.processPublish('missing')).rejects.toThrow();
    });

    it('marks job FAILED on final attempt error', async () => {
      const job = makeJob({ status: 'PENDING', platform: 'YOUTUBE', attempts: 2, maxAttempts: 3 });
      mockPrisma.publishJob.findUnique
        .mockResolvedValueOnce({ ...job, video: { ...job.video, outputUrl: null } });
      mockPrisma.publishJob.update.mockResolvedValue({ ...job, status: 'PROCESSING', attempts: 3 });
      mockPrisma.publishJob.findUnique.mockResolvedValueOnce({ ...job, attempts: 3, maxAttempts: 3 });
      mockPrisma.publishJob.update.mockResolvedValue({ ...job, status: 'FAILED' });

      await expect(service.processPublish('job-1')).rejects.toThrow();

      expect(mockPrisma.publishJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });

    it('throws for unsupported platform', async () => {
      const job = makeJob({ status: 'PENDING', platform: 'UNKNOWN' });
      mockPrisma.publishJob.findUnique.mockResolvedValueOnce(job);
      mockPrisma.publishJob.update.mockResolvedValue({ ...job, attempts: 1 });
      mockPrisma.publishJob.findUnique.mockResolvedValueOnce({ ...job, attempts: 1, maxAttempts: 3 });
      mockPrisma.publishJob.update.mockResolvedValue({ ...job, status: 'PENDING' });

      await expect(service.processPublish('job-1')).rejects.toThrow('Unsupported platform: UNKNOWN');
    });
  });

  // ─── enqueueDueJobs ───────────────────────────────────────────────────────

  describe('enqueueDueJobs', () => {
    it('enqueues due PENDING jobs', async () => {
      const due = [makeJob({ attempts: 0, maxAttempts: 3 })];
      mockPrisma.publishJob.findMany.mockResolvedValue(due);

      await service.enqueueDueJobs();

      expect(mockQueue.add).toHaveBeenCalledWith('publish', { publishJobId: 'job-1' }, expect.any(Object));
    });

    it('does not enqueue jobs that have exhausted attempts', async () => {
      const exhausted = [makeJob({ attempts: 3, maxAttempts: 3 })];
      mockPrisma.publishJob.findMany.mockResolvedValue(exhausted);

      await service.enqueueDueJobs();

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('does nothing when no jobs are due', async () => {
      mockPrisma.publishJob.findMany.mockResolvedValue([]);
      await service.enqueueDueJobs();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});
