import { Module } from '@nestjs/common';
import { ProgramPlansController } from './program-plans.controller';
import { MeProgramPlansController } from './me-program-plans.controller';
import { ProgramPlansService } from './program-plans.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ProgramPlansController, MeProgramPlansController],
  providers: [ProgramPlansService],
})
export class ProgramPlansModule {}
