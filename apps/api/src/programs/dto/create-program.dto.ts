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

const STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export class CreateProgramDto {
  @IsString()
  workoutId!: string;

  @IsString()
  clientId!: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

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
  @IsIn(STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
