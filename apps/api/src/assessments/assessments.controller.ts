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
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { ListAssessmentsDto } from './dto/list-assessments.dto';
import { ReviewAssessmentDto } from './dto/review-assessment.dto';
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

const STAFF_ROLES = [Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN];

@Controller('gyms/:slug/assessments')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get()
  @Roles(...STAFF_ROLES)
  findAll(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Query() query: ListAssessmentsDto,
  ) {
    return this.assessments.findAll(req.org.id, user, query);
  }

  @Post()
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  create(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.assessments.create(req.org.id, user, dto);
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
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  review(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: ReviewAssessmentDto,
  ) {
    return this.assessments.review(id, req.org.id, user, dto);
  }

  @Delete(':id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  remove(
    @Req() req: OrgRequest,
    @Param('id') id: string,
  ) {
    return this.assessments.remove(id, req.org.id);
  }
}
