import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitForReviewDto, ApproveVideoDto, RejectVideoDto } from './review.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  /**
   * Move a DRAFT video into the REVIEW queue.
   */
  async submitForReview(dto: SubmitForReviewDto, userId: string) {
    const video = await this.findOwnedVideo(dto.videoId, userId);

    if (video.status !== 'DRAFT') {
      throw new BadRequestException(
        `Video must be in DRAFT status to submit for review (current: ${video.status})`,
      );
    }

    await this.prisma.video.update({
      where: { id: dto.videoId },
      data: { status: 'REVIEW' },
    });

    const review = await this.prisma.videoReview.create({
      data: {
        videoId: dto.videoId,
        reviewerId: userId,
        action: 'SUBMITTED',
        notes: dto.notes,
      },
    });

    return { video: { ...video, status: 'REVIEW' }, review };
  }

  /**
   * Approve a video that is in REVIEW status.
   */
  async approve(dto: ApproveVideoDto, reviewerId: string) {
    const video = await this.findOwnedOrReviewableVideo(dto.videoId, reviewerId);

    if (video.status !== 'REVIEW') {
      throw new BadRequestException(
        `Only videos in REVIEW status can be approved (current: ${video.status})`,
      );
    }

    const [updatedVideo, review] = await this.prisma.$transaction([
      this.prisma.video.update({
        where: { id: dto.videoId },
        data: { status: 'APPROVED' },
      }),
      this.prisma.videoReview.create({
        data: {
          videoId: dto.videoId,
          reviewerId,
          action: 'APPROVED',
          notes: dto.notes,
        },
      }),
    ]);

    return { video: updatedVideo, review };
  }

  /**
   * Reject a video that is in REVIEW status, sending it back to DRAFT.
   */
  async reject(dto: RejectVideoDto, reviewerId: string) {
    const video = await this.findOwnedOrReviewableVideo(dto.videoId, reviewerId);

    if (video.status !== 'REVIEW') {
      throw new BadRequestException(
        `Only videos in REVIEW status can be rejected (current: ${video.status})`,
      );
    }

    const [updatedVideo, review] = await this.prisma.$transaction([
      this.prisma.video.update({
        where: { id: dto.videoId },
        data: { status: 'DRAFT' },
      }),
      this.prisma.videoReview.create({
        data: {
          videoId: dto.videoId,
          reviewerId,
          action: 'REJECTED',
          notes: dto.notes,
        },
      }),
    ]);

    return { video: updatedVideo, review };
  }

  /**
   * Return all videos in REVIEW status that belong to the requesting user,
   * along with their full review history, ordered newest first.
   */
  async getPending(userId: string) {
    const videos = await this.prisma.video.findMany({
      where: { userId, status: 'REVIEW' },
      include: {
        product: { select: { title: true } },
        reviews: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { total: videos.length, videos };
  }

  /**
   * Return full review history for a specific video (ownership-checked).
   */
  async getHistory(videoId: string, userId: string) {
    await this.findOwnedVideo(videoId, userId);

    const reviews = await this.prisma.videoReview.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findOwnedVideo(videoId: string, userId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, userId },
    });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  /**
   * For approve/reject: the reviewer is identified by userId.
   * In this single-tenant model, any authenticated user can review their own videos.
   * The ownership check ensures cross-user access is blocked.
   */
  private async findOwnedOrReviewableVideo(videoId: string, reviewerId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.userId !== reviewerId) throw new NotFoundException('Video not found');
    return video;
  }
}
