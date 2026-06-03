import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/pagination/pagination.dto';

const PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export class ListPlansDto extends PaginationDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsIn(PLAN_STATUSES)
  status?: string;
}
