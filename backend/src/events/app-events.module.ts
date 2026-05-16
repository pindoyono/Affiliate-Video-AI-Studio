import { Module } from '@nestjs/common';
import { AppEventsListener } from './app-events.listener';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [AnalyticsModule, AgentModule],
  providers: [AppEventsListener],
})
export class AppEventsModule {}
