import { Module } from '@nestjs/common';
import {
  AssessmentsController,
  MemberAssessmentsController,
} from './assessments.controller';
import { MeAssessmentsController } from './me-assessments.controller';
import { AssessmentsService } from './assessments.service';

@Module({
  controllers: [
    AssessmentsController,
    MemberAssessmentsController,
    MeAssessmentsController,
  ],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
