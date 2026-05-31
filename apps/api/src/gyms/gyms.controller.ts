import { Controller, Post, Get, Body, Query, Param, UseGuards } from '@nestjs/common';
import { GymsService } from './gyms.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@hone/database';
import { PaginationDto } from '../common/pagination/pagination.dto';
import type { PaginatedResult } from '../common/pagination/paginated-result.type';
import type { CreateGymResult, GymListItem, GymDetail } from './gyms.service';

@Controller('gyms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class GymsController {
  constructor(private gyms: GymsService) {}

  @Post()
  create(@Body() dto: CreateGymDto): Promise<CreateGymResult> {
    return this.gyms.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto): Promise<PaginatedResult<GymListItem>> {
    return this.gyms.findAll(pagination);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string): Promise<GymDetail> {
    return this.gyms.findBySlug(slug);
  }
}
