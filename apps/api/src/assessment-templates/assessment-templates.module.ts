import { Module } from '@nestjs/common';
import { AssessmentTemplatesController } from './assessment-templates.controller';
import { GymAssessmentTemplatesController } from './gym-assessment-templates.controller';
import { AssessmentTemplatesService } from './assessment-templates.service';

@Module({
  controllers: [AssessmentTemplatesController, GymAssessmentTemplatesController],
  providers: [AssessmentTemplatesService],
  exports: [AssessmentTemplatesService],
})
export class AssessmentTemplatesModule {}
