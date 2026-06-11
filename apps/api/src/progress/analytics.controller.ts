import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ProgressService } from './progress.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
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

@Controller('gyms/:slug/analytics')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
@Roles(Role.BRANCH_MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class AnalyticsController {
  constructor(private readonly progress: ProgressService) {}

  @Get('compliance')
  getComplianceAnalytics(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.progress.getComplianceAnalytics(req.org.id, user, query.period);
  }
}
