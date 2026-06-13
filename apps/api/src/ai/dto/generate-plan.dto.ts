import { IsOptional, IsString, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class GeneratePlanDto {
  @IsOptional()
  @IsString()
  goal?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  totalWeeks!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(180)
  durationMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @IsOptional()
  @IsString()
  startDate?: string;
}
