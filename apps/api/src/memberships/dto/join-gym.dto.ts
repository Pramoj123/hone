import { IsString, IsOptional } from 'class-validator';

export class JoinGymDto {
  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
