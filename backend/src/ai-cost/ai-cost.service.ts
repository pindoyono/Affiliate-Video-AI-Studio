import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackAiUsageDto } from './ai-cost.dto';

// ─── Cost-rate tables ──────────────────────────────────────────────────────────
// All rates are in USD per 1 000 tokens (LLM) or per unit (media).

/** LLM token rates: [promptRate, completionRate] in USD / 1K tokens */
const LLM_RATES: Record<string, [number, number]> = {
  // OpenAI
  'openai/gpt-4o':       [0.005,  0.015],
  'openai/gpt-4o-mini':  [0.00015, 0.0006],
  'openai/gpt-4-turbo':  [0.01,   0.03],
  'openai/gpt-3.5-turbo':[0.0005, 0.0015],
  // DeepSeek
  'deepseek/deepseek-chat': [0.00014, 0.00028],
  // Gemini
  'gemini/gemini-1.5-pro':   [0.00125, 0.005],
  'gemini/gemini-1.5-flash':  [0.000075, 0.0003],
  // Anthropic Claude
  'claude/claude-3-5-sonnet': [0.003, 0.015],
  'claude/claude-3-haiku':    [0.00025, 0.00125],
  'claude/claude-3-opus':     [0.015,  0.075],
};

/** Media cost rates in USD per unit */
const MEDIA_RATES: Record<string, number> = {
  tts:        0.000015,  // USD per character
  image:      0.04,      // USD per image (DALL-E 3 standard)
  video:      0.10,      // USD per minute of rendered video
};

export interface CostBreakdown {
  provider: string;
  service: string;
  requestType: string | null;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
}

export interface CostSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  breakdown: CostBreakdown[];
}

@Injectable()
export class AiCostService {
  constructor(private prisma: PrismaService) {}

  // ─── Write path ─────────────────────────────────────────────────────────────

  /**
   * Record a single AI usage event.
   * If estimatedCost is not supplied it is calculated from the built-in rate table.
   */
  async track(dto: TrackAiUsageDto, userId?: string) {
    const promptTokens = dto.promptTokens ?? 0;
    const completionTokens = dto.completionTokens ?? 0;
    const tokens = dto.tokens ?? promptTokens + completionTokens;
    const estimatedCost = dto.estimatedCost ?? this.calculateCost({
      provider: dto.provider,
      service: dto.service,
      requestType: dto.requestType ?? 'LLM',
      tokens,
      promptTokens,
      completionTokens,
    });

    return this.prisma.aiUsage.create({
      data: {
        service: dto.service,
        provider: dto.provider,
        tokens,
        promptTokens,
        completionTokens,
        estimatedCost,
        requestType: dto.requestType ?? null,
        userId: userId ?? null,
        projectId: dto.projectId ?? null,
      },
    });
  }

  // ─── Read path ───────────────────────────────────────────────────────────────

  /**
   * Dashboard: aggregate all AI costs for a given user.
   */
  async getDashboard(userId: string): Promise<CostSummary> {
    const records = await this.prisma.aiUsage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return this.buildSummary(records);
  }

  /**
   * Cost breakdown for a specific project (e.g. video / product ID).
   * No user ownership check — projectId is a shared context key.
   */
  async getProjectCost(projectId: string): Promise<CostSummary> {
    const records = await this.prisma.aiUsage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return this.buildSummary(records);
  }

  /**
   * Cost breakdown for a specific user.
   */
  async getUserCost(userId: string): Promise<CostSummary> {
    const records = await this.prisma.aiUsage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return this.buildSummary(records);
  }

  // ─── Cost calculation (public for unit-testing) ───────────────────────────

  /**
   * Estimate USD cost for a single AI request.
   * - For LLM requests: uses provider/service rate table (prompt + completion split).
   * - For media requests: uses a flat per-unit rate.
   * Returns 0 when no matching rate is found.
   */
  calculateCost(params: {
    provider: string;
    service: string;
    requestType: string;
    tokens: number;
    promptTokens: number;
    completionTokens: number;
  }): number {
    const { provider, service, requestType, tokens, promptTokens, completionTokens } = params;

    if (requestType !== 'LLM') {
      const mediaKey = requestType.toLowerCase();
      const rate = MEDIA_RATES[mediaKey];
      if (rate === undefined) return 0;
      // tokens field repurposed: character count for TTS, unit count for IMAGE/VIDEO
      return parseFloat((tokens * rate).toFixed(6));
    }

    // LLM: look up by "provider/service" key (case-insensitive)
    const key = `${provider.toLowerCase()}/${service.toLowerCase()}`;
    const rates = LLM_RATES[key];
    if (rates) {
      const [promptRate, completionRate] = rates;
      return parseFloat(
        ((promptTokens * promptRate + completionTokens * completionRate) / 1000).toFixed(6),
      );
    }

    // Fallback: flat 0.002 USD / 1K tokens
    return parseFloat(((tokens * 0.002) / 1000).toFixed(6));
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private buildSummary(
    records: {
      provider: string;
      service: string;
      requestType: string | null;
      tokens: number | null;
      estimatedCost: number | null;
    }[],
  ): CostSummary {
    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;

    // Group by provider + service + requestType
    const groups = new Map<string, CostBreakdown>();

    for (const r of records) {
      totalRequests++;
      totalTokens += r.tokens ?? 0;
      totalCost += r.estimatedCost ?? 0;

      const groupKey = `${r.provider}::${r.service}::${r.requestType ?? ''}`;
      const existing = groups.get(groupKey);
      if (existing) {
        existing.totalRequests++;
        existing.totalTokens += r.tokens ?? 0;
        existing.totalCost += r.estimatedCost ?? 0;
      } else {
        groups.set(groupKey, {
          provider: r.provider,
          service: r.service,
          requestType: r.requestType,
          totalRequests: 1,
          totalTokens: r.tokens ?? 0,
          totalCost: r.estimatedCost ?? 0,
        });
      }
    }

    // Round totals in breakdown
    const breakdown = Array.from(groups.values()).map(b => ({
      ...b,
      totalCost: parseFloat(b.totalCost.toFixed(6)),
    }));

    return {
      totalRequests,
      totalTokens,
      totalCost: parseFloat(totalCost.toFixed(6)),
      breakdown,
    };
  }
}
