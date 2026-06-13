import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from './mail/mail.module';
import { AssessmentTemplatesModule } from './assessment-templates/assessment-templates.module';
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
import { ProgramPlansModule } from './program-plans/program-plans.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ProgressModule } from './progress/progress.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MembershipsModule } from './memberships/memberships.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    MailModule,
    AssessmentTemplatesModule,
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
    ProgramPlansModule,
    SchedulerModule,
    ProgressModule,
    NotificationsModule,
    MembershipsModule,
    AiModule,
  ],
})
export class AppModule {}
