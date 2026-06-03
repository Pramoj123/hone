import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ProgramPlansService } from './program-plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { ListPlansDto } from './dto/list-plans.dto';
import { UpdateEntriesDto } from './dto/update-entries.dto';
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

@Controller('gyms/:slug/program-plans')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class ProgramPlansController {
  constructor(private readonly plans: ProgramPlansService) {}

  @Post()
  @Roles(Role.TRAINER, Role.BRANCH_MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  create(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreatePlanDto,
  ) {
    return this.plans.create(req.org.id, user, dto);
  }

  @Get()
  @Roles(Role.TRAINER, Role.BRANCH_MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  findAll(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Query() query: ListPlansDto,
  ) {
    return this.plans.findAll(req.org.id, user, query);
  }

  // Static routes before :id to avoid NestJS treating them as ID params
  @Post(':id/activate')
  @Roles(Role.TRAINER, Role.BRANCH_MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  activate(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.plans.activate(id, req.org.id, user);
  }

  @Put(':id/entries')
  @Roles(Role.TRAINER, Role.BRANCH_MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  updateEntries(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdateEntriesDto,
  ) {
    return this.plans.updateEntries(id, req.org.id, user, dto);
  }

  @Get(':id')
  @Roles(Role.TRAINER, Role.BRANCH_MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  findOne(@Req() req: OrgRequest, @Param('id') id: string) {
    return this.plans.findOne(id, req.org.id);
  }

  @Delete(':id')
  @Roles(Role.TRAINER, Role.BRANCH_MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  remove(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.plans.remove(id, req.org.id, user);
  }
}
