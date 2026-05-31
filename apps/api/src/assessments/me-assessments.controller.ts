import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/pagination/pagination.dto';
import { Role } from '@hone/database';

@Controller('me/assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class MeAssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserType, @Query() pagination: PaginationDto) {
    return this.assessments.findAllForClient(user.id, pagination);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.assessments.findOneForClient(id, user.id);
  }
}
