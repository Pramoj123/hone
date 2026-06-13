import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ProgramPlansService } from './program-plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdateEntriesDto } from './dto/update-entries.dto';
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

  @Post()
  create(@CurrentUser() user: CurrentUserType, @Body() dto: CreatePlanDto) {
    return this.plans.createForClient(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.plans.findOneForClient(id, user.id);
  }

  @Put(':id/entries')
  updateEntries(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdateEntriesDto,
  ) {
    return this.plans.updateEntriesForClient(id, user.id, dto);
  }

  @Post(':id/activate')
  activate(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.plans.activateForClient(id, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.plans.removeForClient(id, user.id);
  }
}
