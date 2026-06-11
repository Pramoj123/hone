import {
  Controller, Post, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@hone/database';

// ── DTOs ─────────────────────────────────────────────────────────────────────

class SendTestEmailDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  memberName?: string;

  @IsOptional()
  @IsString()
  gymName?: string;
}

const TEST_EMAIL_TYPES = [
  'program-assigned',
  'assessment-assigned',
  'assessment-submitted',
  'weekly-summary',
] as const;
type TestEmailType = (typeof TEST_EMAIL_TYPES)[number];

class AdminTestEmailDto {
  @IsIn(TEST_EMAIL_TYPES)
  type!: TestEmailType;

  @IsEmail()
  recipientEmail!: string;
}

// ── Gym-scoped controller (/gyms/:slug/notifications) ────────────────────────

@Controller('gyms/:slug/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BRANCH_MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /**
   * Smoke-test: send a sample program-assigned email.
   * POST /gyms/:slug/notifications/test
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  async sendTest(
    @Param('slug') _gymSlug: string,
    @Body() body: SendTestEmailDto,
  ): Promise<{ ok: boolean }> {
    await this.notifications.sendTestEmail(body.email, 'program-assigned');
    return { ok: true };
  }
}

// ── Global admin controller (/admin/notifications) ────────────────────────────

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /**
   * Manually trigger weekly summary emails for all members.
   * POST /admin/notifications/trigger-weekly-summary
   */
  @Post('trigger-weekly-summary')
  @HttpCode(HttpStatus.OK)
  async triggerWeeklySummary(): Promise<{ sent: number; failed: number; message: string }> {
    const result = await this.notifications.sendWeeklySummaryToAll();
    return { ...result, message: 'Weekly summary sent' };
  }

  /**
   * Send a test email for any template type to verify Resend config + rendering.
   * POST /admin/notifications/test-email
   * Body: { type: 'program-assigned' | 'assessment-assigned' | 'assessment-submitted' | 'weekly-summary', recipientEmail: string }
   */
  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(
    @Body() body: AdminTestEmailDto,
  ): Promise<{ messageId: string | null; message: string }> {
    const messageId = await this.notifications.sendTestEmail(body.recipientEmail, body.type);
    return { messageId, message: `Test email sent to ${body.recipientEmail}` };
  }
}
