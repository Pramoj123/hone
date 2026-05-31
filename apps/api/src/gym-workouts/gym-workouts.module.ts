import { Module } from '@nestjs/common';
import { GymWorkoutsController } from './gym-workouts.controller';
import { GymWorkoutsService } from './gym-workouts.service';

@Module({
  controllers: [GymWorkoutsController],
  providers: [GymWorkoutsService],
})
export class GymWorkoutsModule {}
