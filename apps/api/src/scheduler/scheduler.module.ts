import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { SchedulerService } from './scheduler.service';
import { SchedulerProcessor } from './scheduler.processor';
import { SchedulerCron } from './scheduler.cron';
import { SchedulerAdminController } from './scheduler-admin.controller';
import { QUEUE_NAME } from './scheduler.processor';

@Module({
  imports: [
    // Register Redis connection — read from REDIS_URL env var
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const url = new URL(redisUrl);
        return {
          redis: {
            host: url.hostname,
            port: url.port ? parseInt(url.port, 10) : 6379,
            password: url.password || undefined,
            tls: url.protocol === 'rediss:' ? {} : undefined,
          },
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 50,
          },
        };
      },
      inject: [ConfigService],
    }),

    // Register the queue — shared between cron, processor, and admin controller
    BullModule.registerQueue({ name: QUEUE_NAME }),
  ],
  providers: [SchedulerService, SchedulerProcessor, SchedulerCron],
  controllers: [SchedulerAdminController],
  exports: [SchedulerService],
})
export class SchedulerModule {}
