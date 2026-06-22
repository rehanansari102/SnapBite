import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
  SendSmtpEmail,
} from '@getbrevo/brevo';
import { Order } from './schemas/order.schema';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly api: TransactionalEmailsApi;
  private readonly fromEmail: string;
  private readonly fromName = 'SnapBite';

  constructor(private configService: ConfigService) {
    this.api = new TransactionalEmailsApi();
    this.api.setApiKey(
      TransactionalEmailsApiApiKeys.apiKey,
      this.configService.getOrThrow('BREVO_API_KEY'),
    );
    this.fromEmail = this.configService.getOrThrow('BREVO_FROM_EMAIL');
  }

  async sendNewOrderToOwner(order: Order & { _id: string; createdAt?: Date }): Promise<void> {
    if (!order.ownerEmail) return;

    const itemRows = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:8px 0;color:#374151;border-bottom:1px solid #f3f4f6">${i.name}</td>
            <td style="padding:8px 0;color:#374151;border-bottom:1px solid #f3f4f6;text-align:center">×${i.quantity}</td>
            <td style="padding:8px 0;color:#111827;font-weight:bold;border-bottom:1px solid #f3f4f6;text-align:right">₨${(i.price * i.quantity).toFixed(0)}</td>
          </tr>`,
      )
      .join('');

    const email = new SendSmtpEmail();
    email.sender = { name: this.fromName, email: this.fromEmail };
    email.to = [{ email: order.ownerEmail }];
    email.subject = `🍔 New Order #${String(order._id).slice(-8).toUpperCase()} — ${order.restaurantName}`;
    email.htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fff;">
        <div style="text-align:center;margin-bottom:28px;">
          <span style="font-size:48px;">🍔</span>
          <h1 style="color:#f97316;margin:8px 0 0;">SnapBite</h1>
        </div>

        <div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
          <h2 style="color:#111827;margin:0 0 4px;">New Order Received!</h2>
          <p style="color:#6b7280;margin:0;font-size:14px;">
            Order <strong>#${String(order._id).slice(-8).toUpperCase()}</strong> placed at
            ${order.createdAt ? new Date(order.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        <h3 style="color:#111827;margin-bottom:12px;">Order Items</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr>
              <th style="text-align:left;color:#9ca3af;font-size:12px;padding-bottom:8px;border-bottom:2px solid #f3f4f6">ITEM</th>
              <th style="text-align:center;color:#9ca3af;font-size:12px;padding-bottom:8px;border-bottom:2px solid #f3f4f6">QTY</th>
              <th style="text-align:right;color:#9ca3af;font-size:12px;padding-bottom:8px;border-bottom:2px solid #f3f4f6">PRICE</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding-top:12px;color:#6b7280;font-size:13px">Subtotal</td>
              <td style="padding-top:12px;text-align:right;color:#374151;font-weight:600">₨${order.subtotal.toFixed(0)}</td>
            </tr>
            <tr>
              <td colspan="2" style="color:#6b7280;font-size:13px">Delivery fee</td>
              <td style="text-align:right;color:#374151;font-weight:600">₨${order.deliveryFee.toFixed(0)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:8px;color:#111827;font-weight:bold;font-size:16px">Total</td>
              <td style="padding-top:8px;text-align:right;color:#f97316;font-weight:900;font-size:16px">₨${order.total.toFixed(0)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background:#eff6ff;padding:14px 20px;border-radius:8px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-weight:bold;color:#1e40af;font-size:13px;">📍 Delivery Address</p>
          <p style="margin:0;color:#374151;font-size:14px;">
            ${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.country}
          </p>
        </div>

        ${order.notes ? `
        <div style="background:#fffbeb;padding:14px 20px;border-radius:8px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-weight:bold;color:#92400e;font-size:13px;">📝 Customer Notes</p>
          <p style="margin:0;color:#374151;font-size:14px;">${order.notes}</p>
        </div>` : ''}

        <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">
          Please confirm this order on your <strong>SnapBite dashboard</strong> as soon as possible.
        </p>

        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
        <p style="color:#d1d5db;font-size:12px;text-align:center;">
          © ${new Date().getFullYear()} SnapBite. All rights reserved.
        </p>
      </div>
    `;

    try {
      await this.api.sendTransacEmail(email);
      this.logger.log(`New order email sent to owner ${order.ownerEmail} for order ${order._id}`);
    } catch (err) {
      this.logger.error(`Failed to send new order email for ${order._id}`, err);
    }
  }
}
