import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeVideo(overrides: Record<string, any> = {}) {
  return {
    id: 'video-1',
    userId: 'user-1',
    status: 'DRAFT',
    title: 'Test Video',
    ...overrides,
  };
}

function makeReview(overrides: Record<string, any> = {}) {
  return {
    id: 'review-1',
    videoId: 'video-1',
    reviewerId: 'user-1',
    action: 'SUBMITTED',
    notes: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockPrisma = {
  video: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  videoReview: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    jest.clearAllMocks();
  });

  // ─── submitForReview ──────────────────────────────────────────────────────

  describe('submitForReview', () => {
    it('moves a DRAFT video to REVIEW and creates a SUBMITTED review record', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(makeVideo({ status: 'DRAFT' }));
      mockPrisma.video.update.mockResolvedValue(makeVideo({ status: 'REVIEW' }));
      const review = makeReview({ action: 'SUBMITTED' });
      mockPrisma.videoReview.create.mockResolvedValue(review);

      const result = await service.submitForReview({ videoId: 'video-1' }, 'user-1');

      expect(mockPrisma.video.update).toHaveBeenCalledWith({
        where: { id: 'video-1' },
        data: { status: 'REVIEW' },
      });
      expect(mockPrisma.videoReview.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'SUBMITTED' }) }),
      );
      expect(result.review.action).toBe('SUBMITTED');
    });

    it('throws BadRequestException when video is not in DRAFT status', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(makeVideo({ status: 'REVIEW' }));

      await expect(
        service.submitForReview({ videoId: 'video-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when video does not belong to user', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(null);

      await expect(
        service.submitForReview({ videoId: 'x' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('stores optional submission notes', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(makeVideo({ status: 'DRAFT' }));
      mockPrisma.video.update.mockResolvedValue(makeVideo({ status: 'REVIEW' }));
      mockPrisma.videoReview.create.mockResolvedValue(
        makeReview({ action: 'SUBMITTED', notes: 'Ready for review' }),
      );

      const result = await service.submitForReview(
        { videoId: 'video-1', notes: 'Ready for review' },
        'user-1',
      );

      expect(result.review.notes).toBe('Ready for review');
    });
  });

  // ─── approve ──────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('moves a REVIEW video to APPROVED and creates an APPROVED review record', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(makeVideo({ status: 'REVIEW' }));
      const updatedVideo = makeVideo({ status: 'APPROVED' });
      const review = makeReview({ action: 'APPROVED' });
      mockPrisma.$transaction.mockResolvedValue([updatedVideo, review]);

      const result = await service.approve({ videoId: 'video-1' }, 'user-1');

      expect(result.video.status).toBe('APPROVED');
      expect(result.review.action).toBe('APPROVED');
    });

    it('throws BadRequestException when video is not in REVIEW status', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(makeVideo({ status: 'DRAFT' }));

      await expect(
        service.approve({ videoId: 'video-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when video does not exist', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      await expect(service.approve({ videoId: 'x' }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when video belongs to a different user', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(makeVideo({ userId: 'other-user' }));

      await expect(service.approve({ videoId: 'video-1' }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── reject ───────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('moves a REVIEW video back to DRAFT and creates a REJECTED review record', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(makeVideo({ status: 'REVIEW' }));
      const updatedVideo = makeVideo({ status: 'DRAFT' });
      const review = makeReview({ action: 'REJECTED', notes: 'Needs more work' });
      mockPrisma.$transaction.mockResolvedValue([updatedVideo, review]);

      const result = await service.reject(
        { videoId: 'video-1', notes: 'Needs more work' },
        'user-1',
      );

      expect(result.video.status).toBe('DRAFT');
      expect(result.review.action).toBe('REJECTED');
      expect(result.review.notes).toBe('Needs more work');
    });

    it('throws BadRequestException when video is not in REVIEW status', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(makeVideo({ status: 'APPROVED' }));

      await expect(
        service.reject({ videoId: 'video-1', notes: 'reason' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when video does not exist', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      await expect(
        service.reject({ videoId: 'x', notes: 'reason' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when video belongs to a different user', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(makeVideo({ userId: 'other-user' }));

      await expect(
        service.reject({ videoId: 'video-1', notes: 'reason' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getPending ───────────────────────────────────────────────────────────

  describe('getPending', () => {
    it('returns only REVIEW videos belonging to the user', async () => {
      const videos = [
        { ...makeVideo({ status: 'REVIEW' }), product: { title: 'P1' }, reviews: [] },
        { ...makeVideo({ id: 'video-2', status: 'REVIEW' }), product: { title: 'P2' }, reviews: [] },
      ];
      mockPrisma.video.findMany.mockResolvedValue(videos);

      const result = await service.getPending('user-1');

      expect(result.total).toBe(2);
      expect(result.videos).toHaveLength(2);
      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', status: 'REVIEW' } }),
      );
    });

    it('returns empty list when no videos are in REVIEW', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      const result = await service.getPending('user-1');

      expect(result.total).toBe(0);
      expect(result.videos).toHaveLength(0);
    });
  });

  // ─── getHistory ───────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('returns review history ordered newest first', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(makeVideo());
      const reviews = [
        makeReview({ id: 'r2', action: 'APPROVED', createdAt: new Date('2026-05-16T12:00:00Z') }),
        makeReview({ id: 'r1', action: 'SUBMITTED', createdAt: new Date('2026-05-16T11:00:00Z') }),
      ];
      mockPrisma.videoReview.findMany.mockResolvedValue(reviews);

      const result = await service.getHistory('video-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('APPROVED');
    });

    it('throws NotFoundException when video does not belong to user', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(null);

      await expect(service.getHistory('x', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
