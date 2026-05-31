import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssessmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(53)
  weekNumber!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  bodyFatPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  waistCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chestCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hipsCm?: number;

  @IsOptional()
  @IsString()
  performanceNotes?: string;

  @IsOptional()
  @IsString()
  goalsNextWeek?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating?: number;
}
