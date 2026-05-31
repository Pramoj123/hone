import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkoutLogsService } from './workout-logs.service';
import { CreateWorkoutLogDto } from './dto/create-workout-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/pagination/pagination.dto';
import { Role } from '@hone/database';

@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class MeLogsController {
  constructor(private readonly logs: WorkoutLogsService) {}

  @Post('programs/:programId/logs')
  createLog(
    @CurrentUser() user: CurrentUserType,
    @Param('programId') programId: string,
    @Body() dto: CreateWorkoutLogDto,
  ) {
    return this.logs.createLog(programId, user.id, dto);
  }

  @Get('logs')
  findAll(@CurrentUser() user: CurrentUserType, @Query() pagination: PaginationDto) {
    return this.logs.findLogsForClient(user.id, pagination);
  }

  @Get('logs/:id')
  findOne(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.logs.findOneForClient(id, user.id);
  }

  @Patch('logs/:id')
  update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkoutLogDto>,
  ) {
    return this.logs.updateLog(id, user.id, dto);
  }
}
