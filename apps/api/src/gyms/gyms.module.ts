import { Module } from '@nestjs/common';
import { GymsController } from './gyms.controller';
import { GymContextController } from './gym-context.controller';
import { GymsService } from './gyms.service';

@Module({
  controllers: [GymsController, GymContextController],
  providers: [GymsService],
})
export class GymsModule {}
