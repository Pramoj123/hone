import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QUEUE_NAME, JOB_NAME } from './scheduler.processor';
import { NotificationsService } from '../notifications/notifications.service';

const JOB_OPTIONS = {
  removeOnComplete: 10,
  removeOnFail: 50,
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 } as const,
};

@Injectable()
export class SchedulerCron {
  private readonly logger = new Logger(SchedulerCron.name);

  constructor(
    @InjectQueue(QUEUE_NAME) private readonly queue: Queue,
    private readonly notifications: NotificationsService,
  ) {}

  /** Runs every Sunday at 23:00 — enqueues the weekly generation job */
  @Cron('0 23 * * 0', { name: 'weekly-recurring-programs', timeZone: 'UTC' })
  async scheduleWeeklyPrograms(): Promise<void> {
    this.logger.log('Sunday 23:00 UTC — enqueueing recurring program generation');
    const job = await this.queue.add(JOB_NAME, {}, JOB_OPTIONS);
    this.logger.log(`Enqueued job id=${job.id}`);
  }

  /** Runs every Monday at 08:00 UTC — sends weekly summary emails to all members */
  @Cron('0 8 * * 1', { name: 'weekly-summary-emails', timeZone: 'UTC' })
  async sendWeeklySummaryEmails(): Promise<void> {
    this.logger.log('[Cron] Starting weekly summary email job');
    try {
      const result = await this.notifications.sendWeeklySummaryToAll();
      this.logger.log(
        `[Cron] Weekly summary complete — sent: ${result.sent}, failed: ${result.failed}`,
      );
    } catch (error) {
      this.logger.error('[Cron] Weekly summary job failed', error);
    }
  }
}
