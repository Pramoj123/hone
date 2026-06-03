import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QUEUE_NAME, JOB_NAME } from './scheduler.processor';

const JOB_OPTIONS = {
  removeOnComplete: 10,  // keep last 10 completed jobs
  removeOnFail: 50,      // keep last 50 failed jobs
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 } as const,
};

@Injectable()
export class SchedulerCron {
  private readonly logger = new Logger(SchedulerCron.name);

  constructor(@InjectQueue(QUEUE_NAME) private readonly queue: Queue) {}

  /** Runs every Sunday at 23:00 — enqueues the weekly generation job */
  @Cron('0 23 * * 0', { name: 'weekly-recurring-programs', timeZone: 'UTC' })
  async scheduleWeeklyPrograms(): Promise<void> {
    this.logger.log('Sunday 23:00 UTC — enqueueing recurring program generation');
    const job = await this.queue.add(JOB_NAME, {}, JOB_OPTIONS);
    this.logger.log(`Enqueued job id=${job.id}`);
  }
}
