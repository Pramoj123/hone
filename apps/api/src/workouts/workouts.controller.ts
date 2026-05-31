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

@Controller('workouts')
@UseGuards(JwtAuthGuard)
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
  ) {
    return this.workouts.findAll(pagination, category, difficulty, search);
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
}
