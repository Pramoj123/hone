import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { GymsService } from './gyms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { Role, type Organization } from '@hone/database';

interface OrgRequest extends Request {
  org: Organization;
}

@Controller('gyms/:slug')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
export class GymContextController {
  constructor(private readonly gyms: GymsService) {}

  @Get('stats')
  stats(@Req() req: OrgRequest, @CurrentUser() user: CurrentUserType) {
    return this.gyms.getStats(req.org.id, user);
  }
}
