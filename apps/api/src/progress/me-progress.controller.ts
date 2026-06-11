import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { VolumeQueryDto } from './dto/volume-query.dto';
import { StreakQueryDto } from './dto/streak-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { Role } from '@hone/database';

@Controller('me/progress')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class MeProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: CurrentUserType) {
    return this.progress.getSummary(user.id);
  }

  @Get('volume')
  getVolume(@CurrentUser() user: CurrentUserType, @Query() query: VolumeQueryDto) {
    return this.progress.getVolume(user.id, query.weeks);
  }

  @Get('prs')
  getPRs(@CurrentUser() user: CurrentUserType) {
    return this.progress.getPRs(user.id);
  }

  @Get('exercise/:workoutId')
  getExerciseLogs(
    @CurrentUser() user: CurrentUserType,
    @Param('workoutId') workoutId: string,
  ) {
    return this.progress.getExerciseLogs(user.id, workoutId);
  }

  @Get('streak-history')
  getStreakHistory(@CurrentUser() user: CurrentUserType, @Query() query: StreakQueryDto) {
    return this.progress.getStreakHistory(user.id, query.days);
  }
}
