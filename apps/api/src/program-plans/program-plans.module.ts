import { Module } from '@nestjs/common';
import { ProgramPlansController } from './program-plans.controller';
import { MeProgramPlansController } from './me-program-plans.controller';
import { ProgramPlansService } from './program-plans.service';

@Module({
  controllers: [ProgramPlansController, MeProgramPlansController],
  providers: [ProgramPlansService],
})
export class ProgramPlansModule {}
