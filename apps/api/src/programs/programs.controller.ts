import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { ListProgramsDto } from './dto/list-programs.dto';
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

@Controller('gyms/:slug/programs')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Get()
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  findAll(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Query() query: ListProgramsDto,
  ) {
    return this.programs.findAll(req.org.id, user, query);
  }

  @Post()
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  create(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateProgramDto,
  ) {
    return this.programs.create(req.org.id, user, dto);
  }

  @Get(':id')
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  findOne(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.programs.findOne(id, req.org.id, user);
  }

  @Patch(':id')
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  update(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProgramDto>,
  ) {
    return this.programs.update(id, req.org.id, user, dto);
  }

  @Delete(':id')
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  remove(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.programs.remove(id, req.org.id, user);
  }
}
