import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AgentController } from './agent.controller';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentWorker } from './agent.worker';
import { TrendAgent } from './agents/trend.agent';
import { ResearchAgent } from './agents/research.agent';
import { AffiliateAgent } from './agents/affiliate.agent';
import { StoryAgent } from './agents/story.agent';
import { ScriptAgent } from './agents/script.agent';
import { VoiceAgent } from './agents/voice.agent';
import { VideoAgent } from './agents/video.agent';
import { AnalyticsAgent } from './agents/analytics.agent';
import { OptimizationAgent } from './agents/optimization.agent';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'agent-tasks' }),
  ],
  controllers: [AgentController],
  providers: [
    AgentOrchestratorService,
    AgentWorker,
    TrendAgent,
    ResearchAgent,
    AffiliateAgent,
    StoryAgent,
    ScriptAgent,
    VoiceAgent,
    VideoAgent,
    AnalyticsAgent,
    OptimizationAgent,
  ],
  exports: [AgentOrchestratorService],
})
export class AgentModule {}
