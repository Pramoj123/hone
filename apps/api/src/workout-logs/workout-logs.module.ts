import { Module } from '@nestjs/common';
import { MeLogsController } from './me-logs.controller';
import { StaffLogsController } from './staff-logs.controller';
import { WorkoutLogsService } from './workout-logs.service';

@Module({
  controllers: [MeLogsController, StaffLogsController],
  providers: [WorkoutLogsService],
  exports: [WorkoutLogsService],
})
export class WorkoutLogsModule {}
