import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MeMembershipsController } from './me-memberships.controller';
import { GymMembershipsController } from './gym-memberships.controller';

@Module({
  controllers: [MeMembershipsController, GymMembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
