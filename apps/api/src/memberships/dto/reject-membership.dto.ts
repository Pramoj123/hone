import { IsOptional, IsString } from 'class-validator';

export class RejectMembershipDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
