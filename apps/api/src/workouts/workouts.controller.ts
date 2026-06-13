import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@hone/database';
import { PaginationDto } from '../common/pagination/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

class WorkoutListDto extends PaginationDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() reviewStatus?: string;
  @IsOptional() @IsString() globalOnly?: string;
}

class RejectDto {
  @IsString() notes!: string;
}

@Controller('workouts')
@UseGuards(JwtAuthGuard)
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Get()
  findAll(@Query() query: WorkoutListDto) {
    return this.workouts.findAll(
      query,
      query.category,
      query.difficulty,
      query.search,
      query.reviewStatus,
      query.globalOnly === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workouts.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateWorkoutDto) {
    return this.workouts.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateWorkoutDto>) {
    return this.workouts.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.workouts.remove(id);
  }

  // ── Review actions ───────────────────────────────────────────────────

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  approve(@Param('id') id: string) {
    return this.workouts.approve(id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.workouts.reject(id, dto.notes);
  }
}
