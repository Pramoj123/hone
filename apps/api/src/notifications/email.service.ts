import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.get<string>('RESEND_API_KEY'));

    const name = config.get<string>('EMAIL_FROM_NAME', 'Hone');
    const addr = config.get<string>('EMAIL_FROM', 'noreply@honefitness.com');
    this.from = `${name} <${addr}>`;
  }

  async send(options: SendOptions): Promise<{ id: string } | null> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
      });

      if (error) {
        this.logger.error(`Resend error sending to ${options.to}: ${JSON.stringify(error)}`);
        return null;
      }

      return data;
    } catch (err) {
      // A failed email must never break the calling flow
      this.logger.error(
        `[EmailService] Failed to send email to ${options.to}: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
