import { IsString, IsOptional } from 'class-validator';

export class ApproveMembershipDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  memberNumber?: string;
}
