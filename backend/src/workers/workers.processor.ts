import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { AiContentService } from '../ai-content/ai-content.service';
import { RenderService } from '../render/render.service';
import { VideosService } from '../videos/videos.service';

@Processor('video-render')
export class VideoRenderWorker {
  private readonly logger = new Logger(VideoRenderWorker.name);

  constructor(
    private prisma: PrismaService,
    private aiContentService: AiContentService,
    private renderService: RenderService,
    private videosService: VideosService,
  ) {}

  @Process('render')
  async handleRender(job: Job<{ videoId: string; userId: string }>) {
    const { videoId } = job.data;
    this.logger.log(`Starting render for video: ${videoId}`);

    try {
      const video = await this.prisma.video.findUnique({
        where: { id: videoId },
        include: { scenes: { orderBy: { order: 'asc' } }, product: true },
      });

      if (!video) throw new Error(`Video ${videoId} not found`);

      const scenes = video.scenes.map(s => ({
        imageUrl: s.imageUrl || undefined,
        audioUrl: s.audioUrl || undefined,
        text: s.narrationText || undefined,
        duration: s.duration,
      }));

      const outputPath = `/tmp/renders/${videoId}.mp4`;
      await this.renderService.renderVideo({ videoId, scenes, outputPath });

      const key = await this.renderService.uploadRenderedVideo(videoId, outputPath);
      const url = await this.renderService.getVideoUrl(key);

      await this.videosService.updateStatus(videoId, 'COMPLETED', url);
      this.logger.log(`Render complete for video: ${videoId}`);
    } catch (err) {
      this.logger.error(`Render failed for ${videoId}: ${err.message}`);
      await this.videosService.updateStatus(videoId, 'FAILED');
      throw err;
    }
  }
}

@Processor('product-import')
export class ProductImportWorker {
  private readonly logger = new Logger(ProductImportWorker.name);

  constructor(private prisma: PrismaService) {}

  @Process('import')
  async handleImport(job: Job<{ productId: string }>) {
    const { productId } = job.data;
    this.logger.log(`Processing product import: ${productId}`);
    // Product data already saved — just update status
    await this.prisma.product.update({
      where: { id: productId },
      data: { status: 'ACTIVE' },
    });
    this.logger.log(`Product import complete: ${productId}`);
  }
}

@Processor('trend-analysis')
export class TrendAnalysisWorker {
  private readonly logger = new Logger(TrendAnalysisWorker.name);

  constructor(private prisma: PrismaService) {}

  @Process('analyze')
  async handleAnalysis(job: Job<{ productId: string }>) {
    const { productId } = job.data;
    this.logger.log(`Analyzing trends for product: ${productId}`);
    // Trend analysis logic handled by TrendsService
    this.logger.log(`Trend analysis queued for: ${productId}`);
  }
}
