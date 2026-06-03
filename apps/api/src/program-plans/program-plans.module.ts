import { Module } from '@nestjs/common';
import { ProgramPlansController } from './program-plans.controller';
import { ProgramPlansService } from './program-plans.service';

@Module({
  controllers: [ProgramPlansController],
  providers: [ProgramPlansService],
})
export class ProgramPlansModule {}
