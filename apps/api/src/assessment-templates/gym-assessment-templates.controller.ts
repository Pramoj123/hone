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
import { AssessmentTemplatesService } from './assessment-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
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

@Controller('gyms/:slug/assessment-templates')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class GymAssessmentTemplatesController {
  constructor(private readonly service: AssessmentTemplatesService) {}

  @Get()
  @Roles(Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN)
  findAll(@Req() req: OrgRequest, @CurrentUser() user: CurrentUserType) {
    return this.service.findAll(user, (req.org as Organization).slug);
  }

  @Post()
  @Roles(Role.ORG_ADMIN, Role.TRAINER, Role.SUPER_ADMIN)
  create(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.service.create(req.org.id, user, dto);
  }

  @Patch(':id')
  @Roles(Role.ORG_ADMIN, Role.TRAINER, Role.SUPER_ADMIN)
  update(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.service.update(id, req.org.id, user, dto);
  }

  @Delete(':id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  deactivate(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.service.deactivate(id, req.org.id, user);
  }
}
