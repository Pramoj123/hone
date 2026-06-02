import { IsObject } from 'class-validator';

export class SubmitAssessmentDto {
  @IsObject()
  responses!: Record<string, unknown>;
}
