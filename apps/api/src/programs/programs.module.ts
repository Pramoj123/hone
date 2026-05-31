import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { MeProgramsController } from './me-programs.controller';
import { ProgramsService } from './programs.service';

@Module({
  controllers: [ProgramsController, MeProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
