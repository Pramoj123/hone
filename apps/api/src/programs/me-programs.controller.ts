import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { ListProgramsDto } from './dto/list-programs.dto';
import { CreateMyProgramDto } from './dto/create-my-program.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import { Role } from '@hone/database';

@Controller('me/programs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class MeProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserType, @Query() query: ListProgramsDto) {
    return this.programs.findForClient(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserType, @Body() dto: CreateMyProgramDto) {
    return this.programs.createForClient(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.programs.findOneForClient(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: Partial<CreateMyProgramDto>,
  ) {
    return this.programs.updateForClient(id, user.id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.programs.removeForClient(id, user.id);
  }
}
