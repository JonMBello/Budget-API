import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface DueItem {
  type: 'CARD' | 'SERVICE' | 'DEBT_COLLECTION';
  title: string;
  amount: number;
  dueDate: string;
  daysRemaining: number;
  extraInfo?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter(): void {
    const provider = this.configService.get<string>('BUDGET_API_EMAIL_PROVIDER') || 'smtp';
    const resendApiKey = this.configService.get<string>('BUDGET_API_RESEND_API_KEY');
    const host = this.configService.get<string>('BUDGET_API_SMTP_HOST');
    const port = this.configService.get<number>('BUDGET_API_SMTP_PORT') || 587;
    const user = this.configService.get<string>('BUDGET_API_SMTP_USER');
    const pass = this.configService.get<string>('BUDGET_API_SMTP_PASS');
    this.fromAddress =
      this.configService.get<string>('BUDGET_API_SMTP_FROM') || 'Budget App <budget@jonmb.com>';

    if (provider === 'resend' && resendApiKey) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: resendApiKey,
        },
      });
      this.logger.log('Resend SMTP transporter configured successfully');
    } else if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP Email transporter configured: ${host}:${port}`);
    } else {
      // Ephemeral mock transport for testing and local development
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.logger.warn(
        'SMTP credentials not fully configured. Using mock JSON transport for email delivery.',
      );
    }
  }

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
      });

      this.logger.log(`Email dispatched successfully to ${options.to}: ${info.messageId || 'ok'}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendDueReminderEmail(
    user: { email: string; name?: string },
    dues: DueItem[],
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const userName = user.name || 'Usuario';
    const totalAmount = dues.reduce((acc, curr) => acc + curr.amount, 0);

    const rows = dues
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: 500;">${item.title}</td>
          <td style="padding: 12px; color: #4a5568;">${item.type === 'CARD' ? 'Tarjeta' : item.type === 'SERVICE' ? 'Servicio' : 'Cobro pendiente'}</td>
          <td style="padding: 12px; font-weight: bold; color: #2d3748;">$${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 12px; color: #e53e3e; font-weight: 600;">${item.dueDate} (${item.daysRemaining === 0 ? '¡Hoy!' : `en ${item.daysRemaining} d`})</td>
        </tr>`,
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 32px; }
          .header { text-align: center; border-bottom: 2px solid #edf2f7; padding-bottom: 20px; margin-bottom: 24px; }
          .header h1 { margin: 0; color: #1a202c; font-size: 24px; }
          .alert-badge { display: inline-block; background-color: #feebc8; color: #c05621; font-weight: 600; padding: 4px 12px; border-radius: 9999px; font-size: 13px; margin-top: 8px; }
          .table-container { margin: 24px 0; overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { background: #f8fafc; color: #718096; font-size: 12px; text-transform: uppercase; padding: 10px 12px; }
          .total-box { background: #edf2f7; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: right; }
          .footer { text-align: center; color: #a0aec0; font-size: 12px; margin-top: 32px; border-top: 1px solid #edf2f7; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Budget App</h1>
            <div class="alert-badge">⏰ Recordatorio de Pagos Próximos</div>
          </div>
          <p>Hola <strong>${userName}</strong>,</p>
          <p>Tienes los siguientes compromisos financieros con fecha límite en los próximos días:</p>
          
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>

          <div class="total-box">
            <span style="font-size: 14px; color: #4a5568;">Total por cubrir: </span>
            <strong style="font-size: 18px; color: #2b6cb0;">$${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>
          </div>

          <p style="font-size: 13px; color: #718096;">Te recomendamos liquidar o verificar tus pagos antes de la fecha límite para evitar comisiones o intereses.</p>

          <div class="footer">
            <p>Este es un correo automático generado por tu plataforma Budget-API.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Recordatorio de Pagos Próximos (${dues.length} pendientes)`,
      html,
    });
  }

  async sendTestEmail(
    to: string,
    title = 'Budget-API Test Email',
    message = 'Your email notifications are configured and functioning correctly!',
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #2b6cb0;">${title}</h2>
        <p>${message}</p>
        <p style="color: #718096; font-size: 12px;">Dispatched at: ${new Date().toISOString()}</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: title,
      html,
    });
  }
}
