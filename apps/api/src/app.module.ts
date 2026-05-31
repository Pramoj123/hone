import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GymsModule } from './gyms/gyms.module';
import { UploadsModule } from './uploads/uploads.module';
import { BranchesModule } from './branches/branches.module';
import { StaffModule } from './staff/staff.module';
import { MembersModule } from './members/members.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { GymWorkoutsModule } from './gym-workouts/gym-workouts.module';
import { ProgramsModule } from './programs/programs.module';
import { WorkoutLogsModule } from './workout-logs/workout-logs.module';
import { AssessmentsModule } from './assessments/assessments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    AuthModule,
    GymsModule,
    UploadsModule,
    BranchesModule,
    StaffModule,
    MembersModule,
    WorkoutsModule,
    GymWorkoutsModule,
    ProgramsModule,
    WorkoutLogsModule,
    AssessmentsModule,
  ],
})
export class AppModule {}
