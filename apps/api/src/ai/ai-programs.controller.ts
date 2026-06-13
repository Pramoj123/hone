import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AiProgramsService } from './ai-programs.service';
import { GenerateDailyDto } from './dto/generate-daily.dto';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { Role } from '@hone/database';

@Controller('me/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class AiProgramsController {
  constructor(private readonly ai: AiProgramsService) {}

  @Get('quota')
  quota(@CurrentUser() user: CurrentUserType) {
    return this.ai.getQuota(user.id);
  }

  @Post('generate-daily')
  generateDaily(@CurrentUser() user: CurrentUserType, @Body() dto: GenerateDailyDto) {
    return this.ai.generateDaily(user.id, dto);
  }

  @Post('generate-plan')
  generatePlan(@CurrentUser() user: CurrentUserType, @Body() dto: GeneratePlanDto) {
    return this.ai.generatePlan(user.id, dto);
  }
}
