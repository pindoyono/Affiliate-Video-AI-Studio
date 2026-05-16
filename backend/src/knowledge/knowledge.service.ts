import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeDto, SearchKnowledgeDto } from './knowledge.dto';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: configService.get<string>('OPENAI_API_KEY', 'placeholder'),
    });
  }

  async create(dto: CreateKnowledgeDto, userId: string) {
    const embedding = await this.getEmbedding(dto.content);
    return this.prisma.knowledgeBase.create({
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category,
        embedding: embedding as any,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.knowledgeBase.findMany({
      where: { userId },
      select: { id: true, title: true, category: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({ where: { id, userId } });
    if (!kb) throw new NotFoundException('Knowledge entry not found');
    return kb;
  }

  async search(dto: SearchKnowledgeDto, userId: string) {
    const queryEmbedding = await this.getEmbedding(dto.query);
    const all = await this.prisma.knowledgeBase.findMany({
      where: { userId },
    });

    const scored = all.map(item => ({
      ...item,
      score: this.cosineSimilarity(queryEmbedding, (item.embedding as number[]) || []),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ embedding: _emb, ...rest }) => rest);
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.knowledgeBase.delete({ where: { id } });
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
}
