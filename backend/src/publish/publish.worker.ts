import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PublishService } from './publish.service';

@Processor('publish-jobs')
export class PublishWorker {
  private readonly logger = new Logger(PublishWorker.name);

  constructor(private readonly publishService: PublishService) {}

  @Process('publish')
  async handlePublish(job: Job<{ publishJobId: string }>) {
    const { publishJobId } = job.data;
    this.logger.log(`Processing publish job ${publishJobId} (attempt ${job.attemptsMade + 1})`);
    await this.publishService.processPublish(publishJobId);
  }
}
