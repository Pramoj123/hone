import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

const STATUSES = ['PENDING', 'SUBMITTED', 'REVIEWED'];

export class ReviewAssessmentDto {
  @IsOptional()
  @IsString()
  trainerNotes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;
}
