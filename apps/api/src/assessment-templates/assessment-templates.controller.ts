import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AssessmentTemplatesService } from './assessment-templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';

class ListTemplatesDto {
  @IsOptional()
  @IsString()
  organizationSlug?: string;
}

@Controller('assessment-templates')
@UseGuards(JwtAuthGuard)
export class AssessmentTemplatesController {
  constructor(private readonly service: AssessmentTemplatesService) {}

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserType,
    @Query() query: ListTemplatesDto,
  ) {
    return this.service.findAll(user, query.organizationSlug);
  }
}
