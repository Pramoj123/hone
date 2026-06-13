import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { ApproveMembershipDto } from './dto/approve-membership.dto';
import { RejectMembershipDto } from './dto/reject-membership.dto';
import { ListMembershipRequestsDto } from './dto/list-membership-requests.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { Role } from '@hone/database';

@Controller('gyms/:slug/membership-requests')
@UseGuards(JwtAuthGuard, RolesGuard, OrgScopeGuard)
@Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.BRANCH_MANAGER)
export class GymMembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  list(
    @Request() req: any,
    @CurrentUser() user: CurrentUserType,
    @Query() query: ListMembershipRequestsDto,
  ) {
    return this.memberships.listRequests(
      req.org.id,
      user,
      query.status,
      query.page,
      query.limit,
    );
  }

  @Post(':id/approve')
  approve(
    @Request() req: any,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: ApproveMembershipDto,
  ) {
    return this.memberships.approveMembership(id, req.org.id, user.id, dto);
  }

  @Post(':id/reject')
  reject(
    @Request() req: any,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: RejectMembershipDto,
  ) {
    return this.memberships.rejectMembership(id, req.org.id, user.id, dto.reason);
  }
}
