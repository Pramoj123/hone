import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ProgressService } from './progress.service';
import { VolumeQueryDto } from './dto/volume-query.dto';
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

@Controller('gyms/:slug/members/:id/progress')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
@Roles(Role.TRAINER, Role.BRANCH_MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class TrainerProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  getMemberProgress(
    @Req() req: OrgRequest,
    @Param('id') memberId: string,
    @CurrentUser() user: CurrentUserType,
    @Query() query: VolumeQueryDto,
  ) {
    return this.progress.getMemberProgress(memberId, req.org.id, user, query.weeks ?? 12);
  }
}
