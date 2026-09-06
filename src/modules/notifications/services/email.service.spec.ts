import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { DueItem, EmailService } from './email.service';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let mockSendMail: jest.Mock;

  beforeEach(async () => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test_msg_id_123' });

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BUDGET_API_SMTP_HOST') return 'smtp.example.com';
              if (key === 'BUDGET_API_SMTP_PORT') return 587;
              if (key === 'BUDGET_API_SMTP_USER') return 'user@example.com';
              if (key === 'BUDGET_API_SMTP_PASS') return 'secret';
              if (key === 'BUDGET_API_SMTP_FROM') return 'Budget <budget@example.com>';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should dispatch email successfully and return messageId', async () => {
      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Hello World</p>',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Test Subject',
          html: '<p>Hello World</p>',
        }),
      );
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test_msg_id_123');
    });

    it('should handle sendMail errors gracefully without throwing', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP Connection timeout'));

      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP Connection timeout');
    });
  });

  describe('sendDueReminderEmail', () => {
    it('should format HTML table with upcoming dues and send reminder email', async () => {
      const mockDues: DueItem[] = [
        {
          type: 'CARD',
          title: 'BBVA Platinum',
          amount: 2500,
          dueDate: '2026-09-08',
          daysRemaining: 3,
        },
        {
          type: 'SERVICE',
          title: 'Internet Fibra Óptica',
          amount: 650,
          dueDate: '2026-09-06',
          daysRemaining: 1,
        },
      ];

      const result = await service.sendDueReminderEmail(
        { email: 'user@example.com', name: 'Juan Pérez' },
        mockDues,
      );

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Recordatorio de Pagos Próximos (2 pendientes)'),
          html: expect.stringContaining('BBVA Platinum'),
        }),
      );
    });
  });

  describe('sendTestEmail', () => {
    it('should dispatch a test email', async () => {
      const result = await service.sendTestEmail('test@example.com');
      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Budget-API Test Email',
        }),
      );
    });
  });

  describe('Resend provider configuration', () => {
    it('should configure Resend SMTP when provider is resend and resendApiKey is provided', async () => {
      const resendConfigModule: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'BUDGET_API_EMAIL_PROVIDER') return 'resend';
                if (key === 'BUDGET_API_RESEND_API_KEY') return 're_test_key_123';
                return null;
              }),
            },
          },
        ],
      }).compile();

      const resendService = resendConfigModule.get<EmailService>(EmailService);
      expect(resendService).toBeDefined();
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.resend.com',
          port: 465,
          auth: { user: 'resend', pass: 're_test_key_123' },
        }),
      );
    });
  });
});
