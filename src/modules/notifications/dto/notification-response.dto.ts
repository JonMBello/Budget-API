import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationTargetType,
} from '../schemas/notification-log.schema';

export class NotificationLogResponseDto {
  @ApiProperty({ example: '654321654321654321654330' })
  id: string;

  @ApiProperty({ example: '654321654321654321654321' })
  userId: string;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.WEB_PUSH })
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationTargetType, example: NotificationTargetType.CARD_PAYMENT_DUE })
  targetType: NotificationTargetType;

  @ApiProperty({ example: '654321654321654321654324' })
  targetId: string;

  @ApiProperty({ example: 'https://fcm.googleapis.com/...' })
  recipient: string;

  @ApiProperty({ example: 'Recordatorio de pago: BBVA Platinum' })
  title: string;

  @ApiProperty({ example: 'Tu tarjeta BBVA Platinum vence en 3 días (2026-10-05).' })
  message: string;

  @ApiProperty({ enum: NotificationStatus, example: NotificationStatus.SENT })
  status: NotificationStatus;

  @ApiProperty({ example: '2026-09-05T14:00:00.000Z' })
  sentAt: Date;

  @ApiPropertyOptional({ example: null })
  errorDetails?: string | null;
}

export class TriggerRemindersResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Due reminders processed successfully' })
  message: string;

  @ApiProperty({ example: 2, description: 'Number of upcoming commitments detected' })
  detectedUpcomingCount: number;

  @ApiProperty({ example: 2, description: 'Number of alerts successfully dispatched' })
  dispatchedAlertsCount: number;

  @ApiProperty({ type: [NotificationLogResponseDto] })
  logs: NotificationLogResponseDto[];
}
