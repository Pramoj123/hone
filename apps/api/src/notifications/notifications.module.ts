import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController, AdminNotificationsController } from './notifications.controller';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [EmailService, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
