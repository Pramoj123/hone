import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProgramPlansService } from './program-plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { Role } from '@hone/database';

@Controller('me/program-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class MeProgramPlansController {
  constructor(private readonly plans: ProgramPlansService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserType) {
    return this.plans.findForClient(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.plans.findOneForClient(id, user.id);
  }
}
