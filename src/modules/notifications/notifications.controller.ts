import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WebPushService } from './services/web-push.service';
import { EmailService } from './services/email.service';
import { DueReminderScheduler } from './services/due-reminder-scheduler.service';
import {
  VapidPublicKeyResponseDto,
  WebPushSubscribeDto,
  WebPushUnsubscribeDto,
} from './dto/web-push-subscription.dto';
import { TestNotificationChannel, TestNotificationDto } from './dto/test-notification.dto';
import { TriggerRemindersResponseDto } from './dto/notification-response.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { SystemConfigService } from '../system-config/system-config.service';

@ApiTags('Notifications')
@Auth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly webPushService: WebPushService,
    private readonly emailService: EmailService,
    private readonly dueReminderScheduler: DueReminderScheduler,
    private readonly usersService: UsersService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  @Get('web-push/public-key')
  @ApiOperation({
    summary: 'Get VAPID public key for Web Push client subscription (applicationServerKey)',
  })
  @ApiResponse({
    status: 200,
    description: 'VAPID public key retrieved successfully',
    type: VapidPublicKeyResponseDto,
  })
  getPublicKey(): VapidPublicKeyResponseDto {
    return {
      publicKey: this.webPushService.getPublicKey(),
    };
  }

  @Post('web-push/subscribe')
  @ApiOperation({
    summary: 'Register or refresh a device Web Push subscription for authenticated user',
  })
  @ApiResponse({
    status: 201,
    description: 'Web Push subscription registered successfully',
  })
  async subscribe(
    @CurrentUser('userId') userId: string,
    @Body() dto: WebPushSubscribeDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.webPushService.subscribe(userId, dto);
    return {
      success: true,
      message: 'Web Push subscription registered successfully',
    };
  }

  @Delete('web-push/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe a device Web Push endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Web Push subscription removed successfully',
  })
  async unsubscribe(
    @CurrentUser('userId') userId: string,
    @Body() dto: WebPushUnsubscribeDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.webPushService.unsubscribe(userId, dto.endpoint);
  }

  @Post('test')
  @ApiOperation({
    summary: 'Send a test notification via Web Push, Email, or both to authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Test notification delivery status',
  })
  async sendTest(
    @CurrentUser('userId') userId: string,
    @Body() dto: TestNotificationDto,
  ): Promise<{ success: boolean; message: string; pushResult?: any; emailResult?: any }> {
    const isEnabled = await this.systemConfigService.isNotificationsEnabled();
    if (!isEnabled) {
      return {
        success: true,
        message: 'Notifications are disabled',
        pushResult: null,
        emailResult: null,
      };
    }

    const channel = dto.channel || TestNotificationChannel.ALL;
    const title = dto.title || 'Budget-API Test Notification';
    const message = dto.message || 'Notifications are active and functioning correctly!';

    let pushResult: any = null;
    let emailResult: any = null;

    if (channel === TestNotificationChannel.ALL || channel === TestNotificationChannel.WEB_PUSH) {
      pushResult = await this.webPushService.sendTestPush(userId, title, message);
    }

    if (channel === TestNotificationChannel.ALL || channel === TestNotificationChannel.EMAIL) {
      let recipientEmail = dto.targetEmail;
      if (!recipientEmail) {
        try {
          const user = await this.usersService.findById(userId);
          recipientEmail = user.email;
        } catch {
          // ignore
        }
      }

      if (recipientEmail) {
        emailResult = await this.emailService.sendTestEmail(recipientEmail, title, message);
      }
    }

    return {
      success: true,
      message: 'Test notification triggered successfully',
      pushResult,
      emailResult,
    };
  }

  @Post('trigger-reminders')
  @ApiOperation({
    summary:
      'Manually trigger upcoming due reminder scan and dispatch alerts for authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Due reminders triggered and logged',
    type: TriggerRemindersResponseDto,
  })
  async triggerReminders(
    @CurrentUser('userId') userId: string,
  ): Promise<TriggerRemindersResponseDto> {
    const result = await this.dueReminderScheduler.runManualCheck(userId);

    return {
      success: true,
      message: result.message,
      detectedUpcomingCount: result.detectedUpcomingCount,
      dispatchedAlertsCount: result.dispatchedAlertsCount,
      logs: result.logs.map((log) => ({
        id: log._id.toString(),
        userId: log.userId.toString(),
        channel: log.channel,
        targetType: log.targetType,
        targetId: log.targetId,
        recipient: log.recipient,
        title: log.title,
        message: log.message,
        status: log.status,
        sentAt: log.sentAt,
        errorDetails: log.errorDetails ?? null,
      })),
    };
  }
}
