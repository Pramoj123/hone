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
} from '@nestjs/common';
import { Request } from 'express';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
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

@Controller('gyms/:slug/branches')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  findAll(@Req() req: OrgRequest, @CurrentUser() user: CurrentUserType) {
    return this.branches.findAll(req.org.id, user);
  }

  @Post()
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  create(@Req() req: OrgRequest, @Body() dto: CreateBranchDto) {
    return this.branches.create(req.org.id, dto);
  }

  @Get(':id')
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  findOne(
    @Req() req: OrgRequest,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.branches.findOne(id, req.org.id, user);
  }

  @Patch(':id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  update(
    @Req() req: OrgRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(id, req.org.id, dto);
  }

  @Delete(':id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  remove(@Req() req: OrgRequest, @Param('id') id: string) {
    return this.branches.remove(id, req.org.id);
  }
}
