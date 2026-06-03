import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { SchedulerService } from './scheduler.service';

export const QUEUE_NAME = 'recurring-programs';
export const JOB_NAME = 'generate-next-week';

@Processor(QUEUE_NAME)
export class SchedulerProcessor {
  private readonly logger = new Logger(SchedulerProcessor.name);

  constructor(private readonly schedulerService: SchedulerService) {}

  @Process(JOB_NAME)
  async handleGenerateNextWeek(job: Job): Promise<{ created: number; skipped: number }> {
    this.logger.log(`Processing job ${job.id} — generating next-week recurring programs`);

    const result = await this.schedulerService.generateNextWeekPrograms();

    this.logger.log(
      `Job ${job.id} complete — created: ${result.created}, skipped: ${result.skipped}`,
    );

    return result;
  }
}
