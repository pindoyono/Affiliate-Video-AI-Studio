import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { AgentOrchestratorService } from './agent-orchestrator.service';

@Processor('agent-tasks')
export class AgentWorker {
  private readonly logger = new Logger(AgentWorker.name);

  constructor(private readonly orchestrator: AgentOrchestratorService) {}

  @Process('run-agent')
  async handleRunAgent(job: Job<{ agentTaskId: string }>) {
    const { agentTaskId } = job.data;
    this.logger.log(
      `AgentWorker processing task ${agentTaskId} (attempt ${job.attemptsMade + 1})`,
    );
    await this.orchestrator.runTask(agentTaskId);
  }
}
