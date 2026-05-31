import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateMemberProfileDto {
  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalConditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsString()
  currentMedications?: string;

  @IsOptional()
  @IsString()
  pastInjuries?: string;

  @IsOptional()
  @IsString()
  pastSurgeries?: string;

  @IsOptional()
  @IsString()
  physicianName?: string;

  @IsOptional()
  @IsString()
  physicianPhone?: string;

  @IsOptional()
  @IsBoolean()
  hasSignedWaiver?: boolean;

  @IsOptional()
  @IsDateString()
  waiverSignedAt?: string;

  @IsOptional()
  @IsString()
  fitnessLevel?: string;

  @IsOptional()
  @IsString()
  primaryGoal?: string;
}
