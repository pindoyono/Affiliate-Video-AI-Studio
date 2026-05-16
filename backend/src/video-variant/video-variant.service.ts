import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from '../ai-content/ollama.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GenerateVariantsDto, SelectVariantDto } from './video-variant.dto';

@Injectable()
export class VideoVariantService {
  private readonly logger = new Logger(VideoVariantService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private ollamaService: OllamaService,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: configService.get<string>('OPENAI_API_KEY', 'placeholder'),
    });
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Generate `count` variants for a given video, persist them,
   * and automatically mark the one with the highest predicted score as winner.
   */
  async generateVariants(dto: GenerateVariantsDto, userId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id: dto.videoId, userId },
      include: { product: true },
    });
    if (!video) throw new NotFoundException('Video not found');

    const count = dto.count ?? 3;
    const productTitle = video.product?.title ?? video.title;
    const description = video.product?.description ?? '';

    // Generate count sets of hooks, titles, and thumbnail prompts
    const [hooks, titles, thumbnails] = await Promise.all([
      this.generateHooks(productTitle, description, count),
      this.generateTitles(productTitle, description, count),
      this.generateThumbnails(productTitle, description, count),
    ]);

    // Pad / trim arrays to exactly `count` items (defensive)
    const safeHooks = this.normalise(hooks, count, `Hook for ${productTitle}`);
    const safeTitles = this.normalise(titles, count, productTitle);
    const safeThumbnails = this.normalise(thumbnails, count, `Thumbnail for ${productTitle}`);

    // Persist all variants and detect winner in a single transaction
    const created = await this.prisma.$transaction(async tx => {
      const records = await Promise.all(
        Array.from({ length: count }, (_, i) => {
          const ctr = this.predictCtr(safeHooks[i], safeTitles[i]);
          const retention = this.predictRetention(safeHooks[i]);
          const score = this.calcScore(ctr, retention);
          return tx.videoVariant.create({
            data: {
              videoId: dto.videoId,
              hook: safeHooks[i],
              title: safeTitles[i],
              thumbnail: safeThumbnails[i],
              ctr,
              retention,
              score,
            },
          });
        }),
      );

      // Mark the highest-scoring variant as winner
      const winnerId = this.detectWinnerId(records);
      if (winnerId) {
        await tx.videoVariant.update({
          where: { id: winnerId },
          data: { isWinner: true },
        });
        return records.map(r => ({ ...r, isWinner: r.id === winnerId }));
      }
      return records;
    });

    return created;
  }

  /**
   * Get a single variant (ownership-checked via video → userId).
   */
  async getVariant(variantId: string, userId: string) {
    const variant = await this.prisma.videoVariant.findFirst({
      where: { id: variantId },
      include: { video: true },
    });
    if (!variant || variant.video.userId !== userId) {
      throw new NotFoundException('Variant not found');
    }
    return variant;
  }

  /**
   * List all variants for a video (ownership-checked).
   */
  async listVariants(videoId: string, userId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, userId },
    });
    if (!video) throw new NotFoundException('Video not found');

    return this.prisma.videoVariant.findMany({
      where: { videoId },
      orderBy: { score: 'desc' },
    });
  }

  /**
   * Mark a specific variant as selected (unselects all siblings first).
   */
  async selectVariant(dto: SelectVariantDto, userId: string) {
    const variant = await this.prisma.videoVariant.findFirst({
      where: { id: dto.variantId },
      include: { video: true },
    });
    if (!variant || variant.video.userId !== userId) {
      throw new NotFoundException('Variant not found');
    }

    await this.prisma.$transaction([
      // Unselect all variants for this video
      this.prisma.videoVariant.updateMany({
        where: { videoId: variant.videoId },
        data: { isSelected: false },
      }),
      // Select the requested variant
      this.prisma.videoVariant.update({
        where: { id: dto.variantId },
        data: { isSelected: true },
      }),
    ]);

    return this.prisma.videoVariant.findUnique({ where: { id: dto.variantId } });
  }

  // ─── AI generation helpers (public for unit-testing) ─────────────────────

  async generateHooks(productTitle: string, description: string, count: number): Promise<string[]> {
    const prompt = `Generate ${count} different compelling 3-second hooks for a TikTok/Reels affiliate video.
Product: ${productTitle}
Description: ${description}
Rules: Each hook must be max 15 words, designed to stop scrolling. Make them varied (curiosity, urgency, social-proof).
Output ONLY a JSON array of exactly ${count} strings, no explanation.`;
    return this.callAIArray(prompt, count, `Hook for ${productTitle}`);
  }

  async generateTitles(productTitle: string, description: string, count: number): Promise<string[]> {
    const prompt = `Generate ${count} different viral video titles for an affiliate marketing video.
Product: ${productTitle}
Description: ${description}
Rules: Each title must be max 60 characters, use power words. Make them varied styles.
Output ONLY a JSON array of exactly ${count} strings, no explanation.`;
    return this.callAIArray(prompt, count, productTitle);
  }

  async generateThumbnails(productTitle: string, description: string, count: number): Promise<string[]> {
    const prompt = `Generate ${count} different thumbnail image prompts for a YouTube/TikTok affiliate video.
Product: ${productTitle}
Description: ${description}
Rules: Each prompt is a visual description for an AI image generator (max 30 words). Vary styles: bold text overlay, lifestyle shot, product close-up.
Output ONLY a JSON array of exactly ${count} strings, no explanation.`;
    return this.callAIArray(prompt, count, `Thumbnail for ${productTitle}`);
  }

  /**
   * Heuristic CTR prediction (0–100) based on hook and title length/quality signals.
   * This is a deterministic approximation so it can be unit-tested without AI.
   */
  predictCtr(hook: string, title: string): number {
    const hookScore = Math.min(hook.trim().split(/\s+/).length * 2, 30);
    const titleScore = Math.min(title.trim().length / 2, 30);
    const questionBonus = hook.includes('?') || title.includes('?') ? 10 : 0;
    const urgencyBonus = /free|now|today|secret|trick|hack/i.test(hook + title) ? 10 : 0;
    return parseFloat(Math.min(hookScore + titleScore + questionBonus + urgencyBonus, 100).toFixed(2));
  }

  /**
   * Heuristic retention prediction (0–100) based on hook engagement signals.
   */
  predictRetention(hook: string): number {
    const words = hook.trim().split(/\s+/).length;
    const base = Math.min(words * 5, 60);
    const emotionBonus = /amazing|shocking|must|never|always|secret/i.test(hook) ? 20 : 0;
    const numberBonus = /\d/.test(hook) ? 10 : 0;
    return parseFloat(Math.min(base + emotionBonus + numberBonus, 100).toFixed(2));
  }

  /**
   * Composite score: 60 % CTR + 40 % retention.
   */
  calcScore(ctr: number, retention: number): number {
    return parseFloat((ctr * 0.6 + retention * 0.4).toFixed(2));
  }

  /**
   * Returns the id of the variant with the highest score, or null for empty arrays.
   */
  detectWinnerId(variants: { id: string; score: number }[]): string | null {
    if (!variants.length) return null;
    return variants.reduce((best, v) => (v.score > best.score ? v : best)).id;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async callAI(prompt: string): Promise<string> {
    const ollamaAvailable = await this.ollamaService.isAvailable();
    if (ollamaAvailable) {
      try {
        return await this.ollamaService.generate(prompt);
      } catch {
        this.logger.warn('Ollama failed, falling back to OpenAI');
      }
    }
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      });
      return response.choices[0]?.message?.content ?? '';
    } catch (err) {
      this.logger.error(`OpenAI fallback failed: ${err.message}`);
      return '[]';
    }
  }

  private async callAIArray(prompt: string, count: number, fallback: string): Promise<string[]> {
    try {
      const raw = await this.callAI(prompt);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      this.logger.warn('Failed to parse AI JSON array, using fallbacks');
    }
    return Array.from({ length: count }, (_, i) => `${fallback} #${i + 1}`);
  }

  /** Pad or trim an array to exactly `length` items. */
  normalise(arr: string[], length: number, fallback: string): string[] {
    const copy = [...arr];
    while (copy.length < length) copy.push(`${fallback} #${copy.length + 1}`);
    return copy.slice(0, length);
  }
}
