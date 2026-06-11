import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { MeProgressController } from './me-progress.controller';
import { TrainerProgressController } from './trainer-progress.controller';
import { AnalyticsController } from './analytics.controller';

@Module({
  controllers: [MeProgressController, TrainerProgressController, AnalyticsController],
  providers: [ProgressService],
})
export class ProgressModule {}
