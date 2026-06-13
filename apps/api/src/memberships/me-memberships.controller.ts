import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { JoinGymDto } from './dto/join-gym.dto';
import { TransferGymDto } from './dto/transfer-gym.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { Role } from '@hone/database';

@Controller('me/membership')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class MeMembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  get(@CurrentUser() user: CurrentUserType) {
    return this.memberships.getMyMembership(user.id);
  }

  @Post('join')
  join(@CurrentUser() user: CurrentUserType, @Body() dto: JoinGymDto) {
    return this.memberships.joinGym(user.id, dto);
  }

  @Post('cancel')
  cancel(@CurrentUser() user: CurrentUserType) {
    return this.memberships.cancelPendingRequest(user.id);
  }

  @Post('leave')
  leave(@CurrentUser() user: CurrentUserType) {
    return this.memberships.leaveGym(user.id);
  }

  @Post('transfer')
  transfer(@CurrentUser() user: CurrentUserType, @Body() dto: TransferGymDto) {
    return this.memberships.transferGym(user.id, dto.slug);
  }
}
