import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@hone/database';
import { QUEUE_NAME, JOB_NAME } from './scheduler.processor';

const JOB_OPTIONS = {
  removeOnComplete: 10,
  removeOnFail: 50,
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 } as const,
};

interface JobSummary {
  jobId: string | number;
  processedOn: number | null;
  finishedOn: number | null;
  returnValue: unknown;
  failedReason?: string;
}

function summarise(job: Job): JobSummary {
  return {
    jobId: job.id,
    processedOn: job.processedOn ?? null,
    finishedOn: job.finishedOn ?? null,
    returnValue: job.returnvalue ?? null,
    failedReason: (job as any).failedReason,
  };
}

@Controller('admin/scheduler')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SchedulerAdminController {
  constructor(@InjectQueue(QUEUE_NAME) private readonly queue: Queue) {}

  /**
   * POST /admin/scheduler/trigger-weekly
   * Immediately enqueues the recurring-program generation job for manual testing.
   */
  @Post('trigger-weekly')
  async triggerWeekly(): Promise<{ jobId: string | number; message: string }> {
    const job = await this.queue.add(JOB_NAME, {}, JOB_OPTIONS);
    return { jobId: job.id, message: 'Job queued — check GET /admin/scheduler/jobs for status' };
  }

  /**
   * GET /admin/scheduler/jobs
   * Returns the last 10 completed jobs and last 10 failed jobs.
   */
  @Get('jobs')
  async getJobs(): Promise<{ completed: JobSummary[]; failed: JobSummary[] }> {
    const [completed, failed] = await Promise.all([
      this.queue.getCompleted(0, 9),
      this.queue.getFailed(0, 9),
    ]);

    return {
      completed: completed.map(summarise).reverse(), // most-recent first
      failed: failed.map(summarise).reverse(),
    };
  }
}
