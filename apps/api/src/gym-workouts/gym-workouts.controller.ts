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
import { GymWorkoutsService, ListGymWorkoutsDto } from './gym-workouts.service';
import { CreateWorkoutDto } from '../workouts/dto/create-workout.dto';
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

const STAFF = [Role.ORG_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN];

@Controller('gyms/:slug/workouts')
@UseGuards(JwtAuthGuard, OrgScopeGuard, RolesGuard)
export class GymWorkoutsController {
  constructor(private readonly gymWorkouts: GymWorkoutsService) {}

  @Get()
  @Roles(...STAFF)
  findAll(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Query() query: ListGymWorkoutsDto,
  ) {
    return this.gymWorkouts.findAll(req.org.id, user, query);
  }

  @Post()
  @Roles(...STAFF)
  create(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateWorkoutDto,
  ) {
    return this.gymWorkouts.create(req.org.id, user, dto);
  }

  @Get(':id')
  @Roles(...STAFF)
  findOne(@Req() req: OrgRequest, @Param('id') id: string) {
    return this.gymWorkouts.findOne(id, req.org.id);
  }

  @Patch(':id')
  @Roles(...STAFF)
  update(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkoutDto>,
  ) {
    return this.gymWorkouts.update(id, req.org.id, user, dto);
  }

  @Delete(':id')
  @Roles(...STAFF)
  remove(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.gymWorkouts.remove(id, req.org.id, user);
  }

  @Post(':id/submit')
  @Roles(...STAFF)
  submitForReview(
    @Req() req: OrgRequest,
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.gymWorkouts.submitForReview(id, req.org.id, user);
  }
}
