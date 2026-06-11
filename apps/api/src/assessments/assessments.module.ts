import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { MeAssessmentsController } from './me-assessments.controller';
import { AssessmentsService } from './assessments.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AssessmentsController, MeAssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
