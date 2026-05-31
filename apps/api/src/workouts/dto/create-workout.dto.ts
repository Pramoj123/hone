import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

const CATEGORIES = ['CARDIO', 'STRENGTH', 'HIIT', 'FLEXIBILITY', 'MOBILITY', 'PLYOMETRICS', 'CORE'];
const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export class CreateWorkoutDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  slug!: string;

  @IsIn(CATEGORIES)
  category!: string;

  @IsIn(DIFFICULTIES)
  difficulty!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  muscleGroups?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  tips?: string;

  @IsOptional()
  @IsString()
  sets?: string;

  @IsOptional()
  @IsString()
  reps?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  restSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  caloriesPerHour?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
