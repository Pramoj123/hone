import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberProfileDto } from './dto/update-member-profile.dto';
import { ListMyClientsDto } from './dto/list-my-clients.dto';
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

@Controller('gyms/:slug/members')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  findAll(@Req() req: OrgRequest, @CurrentUser() user: CurrentUserType) {
    return this.members.findAll(req.org.id, user);
  }

  // Must be declared before GET :id so NestJS doesn't treat "my-clients" as an ID
  @Get('my-clients')
  @Roles(Role.TRAINER, Role.BRANCH_MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  findMyClients(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Query() query: ListMyClientsDto,
  ) {
    return this.members.findMyClients(req.org.id, user.id, query);
  }

  @Post()
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.SUPER_ADMIN)
  create(@Req() req: OrgRequest, @Body() dto: CreateMemberDto) {
    return this.members.create(req.org.id, dto);
  }

  @Get(':id')
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  findOne(
    @Req() req: OrgRequest,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.members.findOne(id, req.org.id, user);
  }

  @Patch(':id')
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.SUPER_ADMIN)
  update(
    @Req() req: OrgRequest,
    @Param('id') id: string,
    @Body() dto: Partial<CreateMemberDto>,
  ) {
    return this.members.update(id, req.org.id, dto);
  }

  @Patch(':id/profile')
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.SUPER_ADMIN)
  updateProfile(
    @Req() req: OrgRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMemberProfileDto,
  ) {
    return this.members.updateProfile(id, req.org.id, dto);
  }

  @Delete(':id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  remove(@Req() req: OrgRequest, @Param('id') id: string) {
    return this.members.remove(id, req.org.id);
  }
}
