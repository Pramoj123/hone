import { IsOptional, IsString, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateDailyDto {
  @IsOptional()
  @IsString()
  focus?: string;

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
}
