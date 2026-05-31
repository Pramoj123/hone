import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
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

@Controller('gyms/:slug/staff')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.SUPER_ADMIN)
  findAll(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Query('role') roleFilter?: string,
  ) {
    return this.staff.findAll(req.org.id, user, roleFilter);
  }

  @Post()
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  create(@Req() req: OrgRequest, @Body() dto: CreateStaffDto) {
    return this.staff.create(req.org.id, dto);
  }

  @Get(':id')
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.SUPER_ADMIN)
  findOne(
    @Req() req: OrgRequest,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.staff.findOne(id, req.org.id, user);
  }

  @Patch(':id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  update(
    @Req() req: OrgRequest,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staff.update(id, req.org.id, dto);
  }

  @Delete(':id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  remove(@Req() req: OrgRequest, @Param('id') id: string) {
    return this.staff.remove(id, req.org.id);
  }
}
