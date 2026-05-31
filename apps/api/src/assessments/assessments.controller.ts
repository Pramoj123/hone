import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/pagination/pagination.dto';
import { Role, type Organization } from '@hone/database';

interface OrgRequest extends Request {
  org: Organization;
}

const STAFF_ROLES = [Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN];

// Top-level list: GET /gyms/:slug/assessments
@Controller('gyms/:slug/assessments')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get()
  @Roles(...STAFF_ROLES)
  findAll(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Query() pagination: PaginationDto,
  ) {
    return this.assessments.findAll(req.org.id, user, pagination);
  }

  @Get(':id')
  @Roles(...STAFF_ROLES)
  findOne(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.assessments.findOne(id, req.org.id, user);
  }

  @Patch(':id')
  @Roles(...STAFF_ROLES)
  update(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: Partial<CreateAssessmentDto>,
  ) {
    return this.assessments.update(id, req.org.id, user, dto);
  }
}

// Member-scoped: POST/GET /gyms/:slug/members/:memberId/assessments
@Controller('gyms/:slug/members/:memberId/assessments')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class MemberAssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Post()
  @Roles(...STAFF_ROLES)
  upsert(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('memberId') memberId: string,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.assessments.upsert(memberId, req.org.id, user, dto);
  }

  @Get()
  @Roles(...STAFF_ROLES)
  findAllForMember(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('memberId') memberId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.assessments.findAllForMember(memberId, req.org.id, user, pagination);
  }
}
