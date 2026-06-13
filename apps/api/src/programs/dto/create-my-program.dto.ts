import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Self-service variant of CreateProgramDto — clientId comes from the JWT,
// trainerId is always null, and status is server-controlled.
export class CreateMyProgramDto {
  @IsString()
  workoutId!: string;

  @IsOptional()
  @IsString()
  targetSets?: string;

  @IsOptional()
  @IsString()
  targetReps?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetDurationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetWeightKg?: number;

  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(DAYS, { each: true })
  recurrenceDays?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
