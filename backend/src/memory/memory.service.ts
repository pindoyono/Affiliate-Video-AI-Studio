import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMemoryDto } from './memory.dto';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: configService.get<string>('OPENAI_API_KEY', 'placeholder'),
    });
  }

  /**
   * Create or update the user's persistent preferences.
   * Re-embeds the preference text so vector retrieval stays current.
   */
  async upsert(dto: UpsertMemoryDto, userId: string) {
    const text = this.preferenceText(dto);
    const embedding = await this.getEmbedding(text);

    return this.prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        niche: dto.niche ?? null,
        targetAudience: dto.targetAudience ?? null,
        contentStyle: dto.contentStyle ?? null,
        language: dto.language ?? 'en',
        embedding,
      },
      update: {
        niche: dto.niche !== undefined ? dto.niche : undefined,
        targetAudience: dto.targetAudience !== undefined ? dto.targetAudience : undefined,
        contentStyle: dto.contentStyle !== undefined ? dto.contentStyle : undefined,
        language: dto.language !== undefined ? dto.language : undefined,
        embedding,
      },
    });
  }

  /**
   * Retrieve the current user preference (without the raw embedding vector).
   */
  async get(userId: string) {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
      select: {
        id: true,
        niche: true,
        targetAudience: true,
        contentStyle: true,
        language: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return pref ?? null;
  }

  /**
   * Build a natural-language context string suitable for injection into AI prompts.
   * Returns an empty string when no preference is set.
   */
  async buildPromptContext(userId: string): Promise<string> {
    const pref = await this.get(userId);
    if (!pref) return '';

    const parts: string[] = [];
    if (pref.niche) parts.push(`Niche: ${pref.niche}`);
    if (pref.targetAudience) parts.push(`Target audience: ${pref.targetAudience}`);
    if (pref.contentStyle) parts.push(`Content style: ${pref.contentStyle}`);
    if (pref.language && pref.language !== 'en') parts.push(`Language: ${pref.language}`);

    if (!parts.length) return '';
    return `\n[User preferences – tailor your response accordingly]\n${parts.join('\n')}\n`;
  }

  /**
   * Vector retrieval: given a free-text query, rank stored KnowledgeBase entries
   * that are most similar to the user's preference embedding.
   * Returns the top-k most relevant knowledge items (similarity > threshold).
   */
  async vectorSearch(
    userId: string,
    queryText: string,
    topK = 5,
    threshold = 0.3,
  ) {
    const queryEmbedding = await this.getEmbedding(queryText);

    const knowledge = await this.prisma.knowledgeBase.findMany({
      where: { userId },
      select: { id: true, title: true, content: true, category: true, embedding: true },
    });

    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
      select: { embedding: true },
    });

    // Blend: 70% query embedding + 30% user-preference embedding (if available)
    const blendedQuery =
      pref && pref.embedding.length
        ? this.blendVectors(queryEmbedding, pref.embedding as number[], 0.7)
        : queryEmbedding;

    const scored = knowledge
      .map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        score: this.cosineSimilarity(blendedQuery, (item.embedding as number[]) || []),
      }))
      .filter(item => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private preferenceText(dto: UpsertMemoryDto): string {
    return [
      dto.niche && `niche: ${dto.niche}`,
      dto.targetAudience && `audience: ${dto.targetAudience}`,
      dto.contentStyle && `style: ${dto.contentStyle}`,
      dto.language && `language: ${dto.language}`,
    ]
      .filter(Boolean)
      .join(', ') || 'general';
  }

  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (err) {
      this.logger.warn(`Embedding failed, using zero vector: ${err.message}`);
      return new Array(1536).fill(0);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  }

  private blendVectors(a: number[], b: number[], weightA: number): number[] {
    if (a.length !== b.length) return a;
    return a.map((ai, i) => weightA * ai + (1 - weightA) * b[i]);
  }
}
