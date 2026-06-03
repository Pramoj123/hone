import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export class PlanEntryDto {
  @IsString()
  workoutId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  weekNumber!: number;

  @IsIn(DAYS)
  dayOfWeek!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetSets?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetReps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetDurationMinutes?: number;
}

export class UpdateEntriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanEntryDto)
  entries!: PlanEntryDto[];
}
