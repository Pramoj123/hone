import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  welcomeEmail,
  programAssignedEmail,
  assessmentReadyEmail,
  passwordChangedEmail,
  passwordResetEmail,
  emailVerificationEmail,
  staffInviteEmail,
  memberInviteEmail,
} from './templates';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly appUrl: string;
  private readonly adminUrl: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    // EMAIL_FROM / EMAIL_FROM_NAME / APP_WEB_URL / APP_ADMIN_URL are enforced by env.validation.ts
    const fromName = this.config.get<string>('EMAIL_FROM_NAME', 'Hone');
    const fromAddr = this.config.get<string>('EMAIL_FROM', 'onboarding@resend.dev');
    this.from = `${fromName} <${fromAddr}>`;
    this.appUrl = this.config.get<string>('APP_WEB_URL', 'http://localhost:3000');
    this.adminUrl = this.config.get<string>('APP_ADMIN_URL', 'http://localhost:3002');
  }

  async sendWelcome(to: string, name: string) {
    const { subject, html } = welcomeEmail({ name, email: to, appUrl: this.appUrl });
    await this.send(to, subject, html);
  }

  async sendProgramAssigned(opts: {
    clientEmail: string;
    clientName: string;
    trainerName: string;
    workoutName: string;
    scheduledDate?: string | null;
    notes?: string | null;
  }) {
    const { subject, html } = programAssignedEmail({ ...opts, appUrl: this.appUrl });
    await this.send(opts.clientEmail, subject, html);
  }

  async sendAssessmentReady(opts: {
    clientEmail: string;
    clientName: string;
    trainerName: string;
    weekNumber: number;
    year: number;
    overallRating?: number | null;
    goalsNextWeek?: string | null;
  }) {
    const { subject, html } = assessmentReadyEmail({ ...opts, appUrl: this.appUrl });
    await this.send(opts.clientEmail, subject, html);
  }

  async sendStaffInvite(to: string, name: string, gymName: string, role: string, token: string) {
    // Staff accept invites in the admin portal, not the member app
    const inviteUrl = `${this.adminUrl}/accept-invite?token=${token}`;
    const { subject, html } = staffInviteEmail({ name, gymName, role, inviteUrl });
    await this.send(to, subject, html);
  }

  async sendMemberInvite(to: string, name: string, gymName: string, token: string) {
    const inviteUrl = `${this.appUrl}/accept-invite?token=${token}`;
    const { subject, html } = memberInviteEmail({ name, gymName, inviteUrl });
    await this.send(to, subject, html);
  }

  async sendEmailVerification(to: string, name: string, token: string) {
    const verifyUrl = `${this.appUrl}/verify-email?token=${token}`;
    const { subject, html } = emailVerificationEmail({ name, verifyUrl });
    await this.send(to, subject, html);
  }

  async sendPasswordReset(to: string, name: string, token: string) {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;
    const { subject, html } = passwordResetEmail({ name, resetUrl });
    await this.send(to, subject, html);
  }

  async sendPasswordChanged(to: string, name: string) {
    const { subject, html } = passwordChangedEmail({ name });
    await this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string) {
    try {
      const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
      if (error) {
        this.logger.error(`Resend error sending to ${to}: ${JSON.stringify(error)}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
    }
  }
}
