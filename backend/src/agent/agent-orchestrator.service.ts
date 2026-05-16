import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchAgentTaskDto, ChainAgentTasksDto } from './agent-task.dto';
import { TrendAgent } from './agents/trend.agent';
import { ResearchAgent } from './agents/research.agent';
import { AffiliateAgent } from './agents/affiliate.agent';
import { StoryAgent } from './agents/story.agent';
import { ScriptAgent } from './agents/script.agent';
import { VoiceAgent } from './agents/voice.agent';
import { VideoAgent } from './agents/video.agent';
import { AnalyticsAgent } from './agents/analytics.agent';
import { OptimizationAgent } from './agents/optimization.agent';
import type { AgentHandler } from './agents/agent-handler.interface';

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  private readonly handlers: Record<string, AgentHandler>;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('agent-tasks') private readonly agentQueue: Queue,
    private readonly trendAgent: TrendAgent,
    private readonly researchAgent: ResearchAgent,
    private readonly affiliateAgent: AffiliateAgent,
    private readonly storyAgent: StoryAgent,
    private readonly scriptAgent: ScriptAgent,
    private readonly voiceAgent: VoiceAgent,
    private readonly videoAgent: VideoAgent,
    private readonly analyticsAgent: AnalyticsAgent,
    private readonly optimizationAgent: OptimizationAgent,
  ) {
    this.handlers = {
      TREND: trendAgent,
      RESEARCH: researchAgent,
      AFFILIATE: affiliateAgent,
      STORY: storyAgent,
      SCRIPT: scriptAgent,
      VOICE: voiceAgent,
      VIDEO: videoAgent,
      ANALYTICS: analyticsAgent,
      OPTIMIZATION: optimizationAgent,
    };
  }

  /**
   * Dispatch a single agent task – persists to DB and enqueues in Bull.
   */
  async dispatch(dto: DispatchAgentTaskDto, userId?: string) {
    const task = await this.prisma.agentTask.create({
      data: {
        agentType: dto.agentType as any,
        input: dto.input,
        userId: userId ?? null,
        chainId: dto.chainId ?? null,
        chainOrder: dto.chainOrder ?? null,
        maxAttempts: dto.maxAttempts ?? 3,
        status: 'PENDING',
      },
    });

    await this.agentQueue.add(
      'run-agent',
      { agentTaskId: task.id },
      {
        attempts: task.maxAttempts,
        backoff: { type: 'exponential', delay: 5_000 },
      },
    );

    this.logger.log(`Dispatched AgentTask ${task.id} (${task.agentType})`);
    return task;
  }

  /**
   * Create and enqueue a chain of ordered agent tasks sharing a chainId.
   * Tasks are queued in order; each successive task's delay ensures they
   * won't start before the prior one has had a chance to complete.
   */
  async chain(dto: ChainAgentTasksDto, userId?: string) {
    const chainId = dto.chainId ?? randomUUID();
    const tasks: any[] = [];

    for (let i = 0; i < dto.tasks.length; i++) {
      const t = dto.tasks[i];
      const task = await this.prisma.agentTask.create({
        data: {
          agentType: t.agentType as any,
          input: t.input,
          userId: userId ?? null,
          chainId,
          chainOrder: i,
          maxAttempts: t.maxAttempts ?? 3,
          status: 'PENDING',
        },
      });
      tasks.push(task);
    }

    // Enqueue all – the worker passes prior output forward via DB
    for (const task of tasks) {
      await this.agentQueue.add(
        'run-agent',
        { agentTaskId: task.id },
        {
          attempts: task.maxAttempts,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      );
    }

    this.logger.log(`Chained ${tasks.length} AgentTasks under chainId ${chainId}`);
    return { chainId, tasks };
  }

  /**
   * Execute a single AgentTask – called by the Bull worker.
   * If the task is part of a chain, previous task's output is merged into input.
   */
  async runTask(agentTaskId: string): Promise<void> {
    const task = await this.prisma.agentTask.findUnique({ where: { id: agentTaskId } });
    if (!task) throw new Error(`AgentTask ${agentTaskId} not found`);

    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      this.logger.warn(`AgentTask ${agentTaskId} already ${task.status} – skipping`);
      return;
    }

    await this.prisma.agentTask.update({
      where: { id: agentTaskId },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });

    try {
      // For chained tasks, merge previous task's output into input
      const input = await this.buildInput(task);

      const handler = this.handlers[task.agentType as string];
      if (!handler) throw new Error(`No handler registered for agent type: ${task.agentType}`);

      const output = await handler.execute(input);

      await this.prisma.agentTask.update({
        where: { id: agentTaskId },
        data: { status: 'COMPLETED', output, error: null },
      });

      this.logger.log(`AgentTask ${agentTaskId} (${task.agentType}) completed`);
    } catch (err) {
      const current = await this.prisma.agentTask.findUnique({ where: { id: agentTaskId } });
      const isFinal = current ? current.attempts >= current.maxAttempts : true;

      await this.prisma.agentTask.update({
        where: { id: agentTaskId },
        data: {
          status: isFinal ? 'FAILED' : 'PENDING',
          error: err.message,
        },
      });

      this.logger.error(`AgentTask ${agentTaskId} failed (attempt ${current?.attempts}): ${err.message}`);
      throw err; // let Bull handle retry
    }
  }

  /**
   * Get a single task (optionally scoped to user).
   */
  async getTask(agentTaskId: string, userId?: string) {
    const task = await this.prisma.agentTask.findFirst({
      where: { id: agentTaskId, ...(userId ? { userId } : {}) },
    });
    if (!task) throw new NotFoundException('AgentTask not found');
    return task;
  }

  /**
   * List tasks for a user, with optional filters.
   */
  async listTasks(
    userId: string,
    options: { status?: string; agentType?: string; chainId?: string } = {},
  ) {
    const tasks = await this.prisma.agentTask.findMany({
      where: {
        userId,
        ...(options.status ? { status: options.status as any } : {}),
        ...(options.agentType ? { agentType: options.agentType as any } : {}),
        ...(options.chainId ? { chainId: options.chainId } : {}),
      },
      orderBy: [{ chainOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return { total: tasks.length, tasks };
  }

  /**
   * Cancel a pending task.
   */
  async cancelTask(agentTaskId: string, userId?: string) {
    const task = await this.getTask(agentTaskId, userId);

    if (!['PENDING', 'FAILED'].includes(task.status)) {
      throw new Error(`Cannot cancel task in status: ${task.status}`);
    }

    return this.prisma.agentTask.update({
      where: { id: agentTaskId },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Monitoring: summary counts per status for the user.
   */
  async getMonitoringSummary(userId: string) {
    const all = await this.prisma.agentTask.findMany({ where: { userId } });
    const byStatus = all.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    }, {});
    const byType = all.reduce<Record<string, number>>((acc, t) => {
      acc[t.agentType] = (acc[t.agentType] ?? 0) + 1;
      return acc;
    }, {});
    return { total: all.length, byStatus, byType };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * For chained tasks (chainOrder > 0), merge the previous task's output
   * into the current task's input so agents can build on prior results.
   */
  private async buildInput(task: any): Promise<Record<string, any>> {
    const base = (task.input ?? {}) as Record<string, any>;

    if (task.chainId && typeof task.chainOrder === 'number' && task.chainOrder > 0) {
      const prev = await this.prisma.agentTask.findFirst({
        where: { chainId: task.chainId, chainOrder: task.chainOrder - 1 },
        orderBy: { createdAt: 'asc' },
      });

      if (prev?.output) {
        return { ...prev.output as Record<string, any>, ...base };
      }
    }

    return base;
  }
}
