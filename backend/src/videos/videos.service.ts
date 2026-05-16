import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoDto } from './videos.dto';

@Injectable()
export class VideosService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('video-render') private renderQueue: Queue,
  ) {}

  async createVideo(dto: CreateVideoDto, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, userId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const video = await this.prisma.video.create({
      data: {
        title: dto.title,
        mode: dto.mode || 'FACELESS',
        status: 'DRAFT',
        userId,
        productId: dto.productId,
        presenterId: dto.presenterId,
        scenes: dto.scenes
          ? {
              create: dto.scenes.map(s => ({
                order: s.order,
                duration: s.duration,
                imagePrompt: s.imagePrompt,
                narrationText: s.narrationText,
                status: 'PENDING',
              })),
            }
          : undefined,
      },
      include: { scenes: true },
    });

    return video;
  }

  async getVideos(userId: string) {
    return this.prisma.video.findMany({
      where: { userId },
      include: { product: { select: { title: true } }, scenes: { select: { id: true, order: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVideo(id: string, userId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id, userId },
      include: { product: true, scenes: { orderBy: { order: 'asc' } }, presenter: true },
    });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  async startRender(id: string, userId: string) {
    const video = await this.getVideo(id, userId);
    await this.prisma.video.update({ where: { id }, data: { status: 'RENDERING' } });
    await this.renderQueue.add('render', { videoId: id, userId }, { attempts: 3, backoff: 5000 });
    return { message: 'Render job queued', videoId: id, status: 'RENDERING' };
  }

  async getStatus(id: string, userId: string) {
    const video = await this.getVideo(id, userId);
    return { status: video.status, outputUrl: video.outputUrl, duration: video.duration };
  }

  async updateStatus(id: string, status: string, outputUrl?: string) {
    return this.prisma.video.update({
      where: { id },
      data: { status: status as any, outputUrl },
    });
  }
}
