import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export enum TestNotificationChannel {
  ALL = 'ALL',
  WEB_PUSH = 'WEB_PUSH',
  EMAIL = 'EMAIL',
}

export class TestNotificationDto {
  @ApiPropertyOptional({
    enum: TestNotificationChannel,
    default: TestNotificationChannel.ALL,
    example: TestNotificationChannel.ALL,
    description: 'Channel to dispatch the test notification through',
  })
  @IsOptional()
  @IsEnum(TestNotificationChannel, {
    message: 'channel must be one of: ALL, WEB_PUSH, EMAIL',
  })
  channel?: TestNotificationChannel;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Optional custom recipient email address for test email',
  })
  @IsOptional()
  @IsEmail({}, { message: 'targetEmail must be a valid email address' })
  targetEmail?: string;

  @ApiPropertyOptional({
    example: 'Budget App Test Alert',
    description: 'Custom title for test message',
  })
  @IsOptional()
  @IsString({ message: 'title must be a string' })
  title?: string;

  @ApiPropertyOptional({
    example: 'This is a test notification from Budget-API',
    description: 'Custom message body',
  })
  @IsOptional()
  @IsString({ message: 'message must be a string' })
  message?: string;
}
