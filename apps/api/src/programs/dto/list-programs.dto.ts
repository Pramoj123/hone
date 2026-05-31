import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/pagination/pagination.dto';

const STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export class ListProgramsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;
}
