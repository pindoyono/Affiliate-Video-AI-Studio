import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
import { TrendAgent } from './agents/trend.agent';
import { ResearchAgent } from './agents/research.agent';
import { AffiliateAgent } from './agents/affiliate.agent';
import { StoryAgent } from './agents/story.agent';
import { ScriptAgent } from './agents/script.agent';
import { VoiceAgent } from './agents/voice.agent';
import { VideoAgent } from './agents/video.agent';
import { AnalyticsAgent } from './agents/analytics.agent';
import { OptimizationAgent } from './agents/optimization.agent';

// ─── Mock factories ────────────────────────────────────────────────────────

function makeTask(overrides: Record<string, any> = {}) {
  return {
    id: 'task-1',
    agentType: 'TREND',
    input: { niche: 'beauty' },
    output: null,
    status: 'PENDING',
    error: null,
    attempts: 0,
    maxAttempts: 3,
    userId: 'user-1',
    chainId: null,
    chainOrder: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const mockQueue = {
  add: jest.fn().mockResolvedValue({}),
};

const mockPrisma = {
  agentTask: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const agentProviders = [
  TrendAgent,
  ResearchAgent,
  AffiliateAgent,
  StoryAgent,
  ScriptAgent,
  VoiceAgent,
  VideoAgent,
  AnalyticsAgent,
  OptimizationAgent,
];

// ─── Suite ─────────────────────────────────────────────────────────────────

describe('AgentOrchestratorService', () => {
  let service: AgentOrchestratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentOrchestratorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('agent-tasks'), useValue: mockQueue },
        ...agentProviders,
      ],
    }).compile();

    service = module.get<AgentOrchestratorService>(AgentOrchestratorService);
    jest.resetAllMocks();
    mockQueue.add.mockResolvedValue({});
  });

  // ─── dispatch ─────────────────────────────────────────────────────────────

  describe('dispatch', () => {
    it('creates a DB record and enqueues a Bull job', async () => {
      const task = makeTask();
      mockPrisma.agentTask.create.mockResolvedValue(task);

      const result = await service.dispatch(
        { agentType: 'TREND' as any, input: { niche: 'beauty' } },
        'user-1',
      );

      expect(mockPrisma.agentTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ agentType: 'TREND', userId: 'user-1' }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'run-agent',
        { agentTaskId: task.id },
        expect.any(Object),
      );
      expect(result.id).toBe('task-1');
    });

    it('stores maxAttempts from DTO when provided', async () => {
      const task = makeTask({ maxAttempts: 5 });
      mockPrisma.agentTask.create.mockResolvedValue(task);

      await service.dispatch(
        { agentType: 'SCRIPT' as any, input: {}, maxAttempts: 5 },
        'user-1',
      );

      const createCall = mockPrisma.agentTask.create.mock.calls[0][0];
      expect(createCall.data.maxAttempts).toBe(5);
    });
  });

  // ─── chain ────────────────────────────────────────────────────────────────

  describe('chain', () => {
    it('creates tasks with ascending chainOrder and enqueues each', async () => {
      mockPrisma.agentTask.create
        .mockResolvedValueOnce(makeTask({ id: 'task-A', chainOrder: 0, agentType: 'TREND' }))
        .mockResolvedValueOnce(makeTask({ id: 'task-B', chainOrder: 1, agentType: 'SCRIPT' }));

      const result = await service.chain(
        {
          chainId: 'chain-1',
          tasks: [
            { agentType: 'TREND' as any, input: {} },
            { agentType: 'SCRIPT' as any, input: {} },
          ],
        },
        'user-1',
      );

      expect(mockPrisma.agentTask.create).toHaveBeenCalledTimes(2);
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      expect(result.chainId).toBe('chain-1');
      expect(result.tasks).toHaveLength(2);
    });

    it('auto-generates chainId when not provided', async () => {
      mockPrisma.agentTask.create
        .mockResolvedValueOnce(makeTask({ id: 'task-A', chainOrder: 0 }));

      const result = await service.chain(
        { tasks: [{ agentType: 'ANALYTICS' as any, input: {} }] },
        'user-1',
      );

      expect(result.chainId).toBeDefined();
      expect(typeof result.chainId).toBe('string');
    });
  });

  // ─── runTask ──────────────────────────────────────────────────────────────

  describe('runTask', () => {
    it('executes the correct handler and marks task COMPLETED', async () => {
      const task = makeTask({ agentType: 'TREND' });
      mockPrisma.agentTask.findUnique
        .mockResolvedValueOnce(task) // initial lookup
        .mockResolvedValueOnce({ ...task, attempts: 1 }); // after increment (not used in success path)

      mockPrisma.agentTask.update.mockResolvedValue({ ...task, status: 'PROCESSING' });

      await service.runTask('task-1');

      // Should have updated to PROCESSING then COMPLETED
      const calls = mockPrisma.agentTask.update.mock.calls;
      expect(calls[0][0].data).toMatchObject({ status: 'PROCESSING', attempts: { increment: 1 } });
      expect(calls[1][0].data.status).toBe('COMPLETED');
      expect(calls[1][0].data.output).toBeDefined();
    });

    it('skips tasks that are already COMPLETED', async () => {
      mockPrisma.agentTask.findUnique.mockResolvedValue(makeTask({ status: 'COMPLETED' }));

      await service.runTask('task-1');

      expect(mockPrisma.agentTask.update).not.toHaveBeenCalled();
    });

    it('marks task FAILED after max attempts and re-throws', async () => {
      const task = makeTask({ agentType: 'TREND', attempts: 3, maxAttempts: 3 });
      mockPrisma.agentTask.findUnique
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce({ ...task, attempts: 3 }); // after increment
      mockPrisma.agentTask.update.mockResolvedValue({});

      // Force the handler to throw
      jest.spyOn(service['handlers']['TREND'], 'execute').mockRejectedValue(new Error('boom'));

      await expect(service.runTask('task-1')).rejects.toThrow('boom');

      const updateCalls = mockPrisma.agentTask.update.mock.calls;
      const failCall = updateCalls.find(c => c[0].data.status === 'FAILED');
      expect(failCall).toBeDefined();
    });

    it('merges previous task output into input for chained tasks', async () => {
      const chainTask = makeTask({
        agentType: 'SCRIPT',
        chainId: 'chain-1',
        chainOrder: 1,
        input: { extra: 'value' },
      });
      const prevTask = makeTask({
        id: 'task-prev',
        agentType: 'TREND',
        chainId: 'chain-1',
        chainOrder: 0,
        status: 'COMPLETED',
        output: { trendScore: 99, niche: 'tech' },
      });

      mockPrisma.agentTask.findUnique.mockResolvedValue(chainTask);
      mockPrisma.agentTask.findFirst.mockResolvedValue(prevTask);
      mockPrisma.agentTask.update.mockResolvedValue({});

      const executeSpy = jest.spyOn(service['handlers']['SCRIPT'], 'execute');

      await service.runTask('task-1');

      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ trendScore: 99, extra: 'value' }),
      );
    });

    it('throws when agentTaskId does not exist', async () => {
      mockPrisma.agentTask.findUnique.mockResolvedValue(null);

      await expect(service.runTask('nonexistent')).rejects.toThrow('AgentTask nonexistent not found');
    });
  });

  // ─── getTask ──────────────────────────────────────────────────────────────

  describe('getTask', () => {
    it('returns the task when found', async () => {
      const task = makeTask();
      mockPrisma.agentTask.findFirst.mockResolvedValue(task);

      const result = await service.getTask('task-1', 'user-1');
      expect(result.id).toBe('task-1');
    });

    it('throws NotFoundException when task not found', async () => {
      mockPrisma.agentTask.findFirst.mockResolvedValue(null);
      await expect(service.getTask('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listTasks ────────────────────────────────────────────────────────────

  describe('listTasks', () => {
    it('returns all tasks for the user', async () => {
      mockPrisma.agentTask.findMany.mockResolvedValue([makeTask(), makeTask({ id: 'task-2' })]);

      const result = await service.listTasks('user-1');
      expect(result.total).toBe(2);
    });

    it('filters by status when provided', async () => {
      mockPrisma.agentTask.findMany.mockResolvedValue([makeTask({ status: 'COMPLETED' })]);

      await service.listTasks('user-1', { status: 'COMPLETED' });

      const where = mockPrisma.agentTask.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('COMPLETED');
    });
  });

  // ─── cancelTask ───────────────────────────────────────────────────────────

  describe('cancelTask', () => {
    it('cancels a PENDING task', async () => {
      const task = makeTask({ status: 'PENDING' });
      mockPrisma.agentTask.findFirst.mockResolvedValue(task);
      mockPrisma.agentTask.update.mockResolvedValue({ ...task, status: 'CANCELLED' });

      const result = await service.cancelTask('task-1', 'user-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('throws when trying to cancel a PROCESSING task', async () => {
      mockPrisma.agentTask.findFirst.mockResolvedValue(makeTask({ status: 'PROCESSING' }));

      await expect(service.cancelTask('task-1', 'user-1')).rejects.toThrow(
        'Cannot cancel task in status: PROCESSING',
      );
    });
  });

  // ─── getMonitoringSummary ─────────────────────────────────────────────────

  describe('getMonitoringSummary', () => {
    it('returns aggregated counts by status and type', async () => {
      mockPrisma.agentTask.findMany.mockResolvedValue([
        makeTask({ status: 'COMPLETED', agentType: 'TREND' }),
        makeTask({ id: 'task-2', status: 'FAILED', agentType: 'SCRIPT' }),
        makeTask({ id: 'task-3', status: 'COMPLETED', agentType: 'TREND' }),
      ]);

      const result = await service.getMonitoringSummary('user-1');
      expect(result.total).toBe(3);
      expect(result.byStatus['COMPLETED']).toBe(2);
      expect(result.byStatus['FAILED']).toBe(1);
      expect(result.byType['TREND']).toBe(2);
    });
  });
});
