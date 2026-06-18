import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
  SendSmtpEmail,
} from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiInstance: TransactionalEmailsApi;
  private readonly fromEmail: string;
  private readonly fromName = 'SnapBite';

  constructor(private configService: ConfigService) {
    this.apiInstance = new TransactionalEmailsApi();
    this.apiInstance.setApiKey(
      TransactionalEmailsApiApiKeys.apiKey,
      this.configService.getOrThrow('BREVO_API_KEY'),
    );
    this.fromEmail = this.configService.getOrThrow('BREVO_FROM_EMAIL');
  }

  async sendPasswordReset(toEmail: string, resetLink: string): Promise<void> {
    const email = new SendSmtpEmail();

    email.sender = { name: this.fromName, email: this.fromEmail };
    email.to = [{ email: toEmail }];
    email.subject = 'Reset your SnapBite password';
    email.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #fff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="font-size: 48px;">🍔</span>
          <h1 style="color: #f97316; margin: 8px 0 0;">SnapBite</h1>
        </div>
        <h2 style="color: #111827; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.6;">
          We received a request to reset your SnapBite password.
          Click the button below to choose a new one.
        </p>
        <a href="${resetLink}"
           style="display: inline-block; background: #f97316; color: #fff; font-weight: bold;
                  padding: 14px 28px; border-radius: 12px; text-decoration: none; font-size: 15px;">
          Reset Password →
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; line-height: 1.6;">
          This link expires in <strong>1 hour</strong>. If you didn't request a password reset,
          you can safely ignore this email — your password will not change.
        </p>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
        <p style="color: #d1d5db; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} SnapBite. All rights reserved.
        </p>
      </div>
    `;

    try {
      await this.apiInstance.sendTransacEmail(email);
      this.logger.log(`Password reset email sent to ${toEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${toEmail}`, err);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendEmailVerification(toEmail: string, verifyLink: string): Promise<void> {
    const email = new SendSmtpEmail();

    email.sender = { name: this.fromName, email: this.fromEmail };
    email.to = [{ email: toEmail }];
    email.subject = 'Verify your SnapBite email';
    email.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #fff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="font-size: 48px;">🍔</span>
          <h1 style="color: #f97316; margin: 8px 0 0;">SnapBite</h1>
        </div>
        <h2 style="color: #111827; margin-bottom: 8px;">Verify your email address</h2>
        <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.6;">
          Thanks for signing up! Click the button below to confirm your email
          and start ordering from the best restaurants near you.
        </p>
        <a href="${verifyLink}"
           style="display: inline-block; background: #f97316; color: #fff; font-weight: bold;
                  padding: 14px 28px; border-radius: 12px; text-decoration: none; font-size: 15px;">
          Verify email →
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; line-height: 1.6;">
          This link expires in <strong>24 hours</strong>. If you didn't create a SnapBite account,
          you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
        <p style="color: #d1d5db; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} SnapBite. All rights reserved.
        </p>
      </div>
    `;

    try {
      await this.apiInstance.sendTransacEmail(email);
      this.logger.log(`Verification email sent to ${toEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${toEmail}`, err);
      throw new Error('Failed to send verification email');
    }
  }
}
