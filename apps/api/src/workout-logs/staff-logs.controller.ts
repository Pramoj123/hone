import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { WorkoutLogsService } from './workout-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/pagination/pagination.dto';
import { Role, type Organization } from '@hone/database';

interface OrgRequest extends Request {
  org: Organization;
}

@Controller('gyms/:slug/members/:memberId/logs')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class StaffLogsController {
  constructor(private readonly logs: WorkoutLogsService) {}

  @Get()
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  findAll(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('memberId') memberId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.logs.findLogsForMember(memberId, req.org.id, user, pagination);
  }
}
