import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  welcomeEmail,
  programAssignedEmail,
  assessmentReadyEmail,
  passwordChangedEmail,
} from './templates';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly appUrl: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.from = this.config.get<string>('MAIL_FROM', 'Hone <onboarding@resend.dev>');
    this.appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
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
