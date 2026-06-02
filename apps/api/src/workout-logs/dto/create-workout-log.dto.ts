import { IsInt, IsNumber, IsOptional, IsString, IsArray, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkoutLogDto {
  @IsOptional()
  @IsArray()
  sets?: Array<{
    setNumber: number;
    weightKg: number;
    reps: number;
    completed: boolean;
  }>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  actualSets?: number;

  @IsOptional()
  @IsString()
  actualReps?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  actualDurationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  rpe?: number;

  @IsOptional()
  @IsString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
